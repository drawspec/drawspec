import { randomBytes } from "node:crypto";
import * as path from "node:path";
import * as vscode from "vscode";

export class PreviewPanel {
  private static readonly viewType = "drawspec.preview";
  private readonly panel: vscode.WebviewPanel;
  private disposed = false;

  private constructor(panel: vscode.WebviewPanel, private readonly extensionUri: vscode.Uri) {
    this.panel = panel;
    this.panel.onDidDispose(() => {
      this.disposed = true;
    });
    this.panel.webview.onDidReceiveMessage((msg: unknown) => {
      if (isPreviewMessage(msg)) {
        void this.openSource(msg.filePath, msg.line);
      }
    });
  }

  static create(extensionUri: vscode.Uri): PreviewPanel {
    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      "DrawSpec Preview",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    const instance = new PreviewPanel(panel, extensionUri);
    instance.update();
    return instance;
  }

  setSvgContent(svgContent: string): void {
    if (this.disposed) return;
    const nonce = getNonce();
    const script = getClickHandlerScript(nonce);
    this.panel.webview.html = wrapSvg(this.panel.webview, svgContent, script, nonce);
  }

  private async openSource(filePath: string, line: number | undefined): Promise<void> {
    const fileUri = resolveWorkspaceFile(filePath);
    if (fileUri === undefined) return;

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(doc);
    const position = new vscode.Position(toDocumentLine(line, doc.lineCount), 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }

  private update(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      const nonce = getNonce();
      this.panel.webview.html = wrapSvg(this.panel.webview, "", getClickHandlerScript(nonce), nonce);
      return;
    }
    const svgContent = editor.document.getText();
    this.setSvgContent(svgContent);
  }
}

interface PreviewMessage {
  type: "openSource";
  filePath: string;
  line?: number;
}

function isPreviewMessage(msg: unknown): msg is PreviewMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const candidate = msg as Record<string, unknown>;
  return (
    candidate.type === "openSource" &&
    typeof candidate.filePath === "string" &&
    candidate.filePath.trim().length > 0 &&
    (candidate.line === undefined || (typeof candidate.line === "number" && Number.isFinite(candidate.line)))
  );
}

function getClickHandlerScript(nonce: string): string {
  return `<script nonce="${nonce}">
(function() {
  const vscode = acquireVsCodeApi();
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-source-file]');
    if (el) {
      var file = el.getAttribute('data-source-file');
      var parsedLine = parseInt(el.getAttribute('data-source-line') || '1', 10);
      var line = Number.isFinite(parsedLine) && parsedLine > 0 ? parsedLine : 1;
      if (file) {
        vscode.postMessage({ type: 'openSource', filePath: file, line: line });
      }
    }
  });
})();
</script>`;
}

function wrapSvg(webview: vscode.Webview, svgContent: string, script: string, nonce: string): string {
  const safeSvg = sanitizeSvg(svgContent);
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8">',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "<title>DrawSpec Preview</title>",
    `<style nonce="${nonce}">`,
    "  body { margin: 0; padding: 16px; background: #fff; }",
    "  svg { max-width: 100%; height: auto; }",
    "  [data-source-file] { cursor: pointer; }",
    "  [data-source-file]:hover { filter: brightness(0.95); }",
    "</style>",
    "</head>",
    "<body>",
    safeSvg,
    script,
    "</body>",
    "</html>",
  ].join("\n");
}

function getNonce(): string {
  return randomBytes(16).toString("base64");
}

function sanitizeSvg(svgContent: string): string {
  return svgContent
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*script\b[^>]*\/\s*>/gi, "")
    .replace(/<\s*foreignObject\b[^>]*>[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, "")
    .replace(/<\s*foreignObject\b[^>]*\/\s*>/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*javascript:[^\s>]+/gi, "");
}

function resolveWorkspaceFile(filePath: string): vscode.Uri | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders === undefined || workspaceFolders.length === 0) return undefined;

  const requestedPath = filePath.trim();
  if (requestedPath.length === 0) return undefined;

  for (const folder of workspaceFolders) {
    if (folder.uri.scheme !== "file") continue;
    const workspacePath = path.resolve(folder.uri.fsPath);
    const candidatePath = path.isAbsolute(requestedPath)
      ? path.resolve(requestedPath)
      : path.resolve(workspacePath, requestedPath);

    if (isPathInside(candidatePath, workspacePath)) {
      return vscode.Uri.file(candidatePath);
    }
  }

  return undefined;
}

function isPathInside(candidatePath: string, workspacePath: string): boolean {
  const relativePath = path.relative(workspacePath, candidatePath);
  return relativePath === "" || (relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function toDocumentLine(line: number | undefined, lineCount: number): number {
  const fallbackLine = 1;
  const oneBasedLine = line === undefined || !Number.isFinite(line) ? fallbackLine : Math.trunc(line);
  const clampedLine = Math.min(Math.max(oneBasedLine, 1), Math.max(lineCount, 1));
  return clampedLine - 1;
}
