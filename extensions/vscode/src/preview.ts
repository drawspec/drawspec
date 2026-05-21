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
      if (
        typeof msg === "object" && msg !== null &&
        "type" in msg && (msg as { type: string }).type === "openSource" &&
        "filePath" in msg && typeof (msg as { filePath: unknown }).filePath === "string" &&
        "line" in msg && typeof (msg as { line: unknown }).line === "number" && (msg as { line: number }).line >= 1
      ) {
        const { filePath, line } = msg as { type: string; filePath: string; line: number };
        void this.openSource(filePath, line);
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
    const safe = sanitizeSvg(svgContent);
    const script = getClickHandlerScript();
    this.panel.webview.html = wrapSvg(safe, script);
  }

  private async openSource(filePath: string, line: number): Promise<void> {
    const resolved = this.resolvePath(filePath);
    if (resolved === undefined) return;
    const clampedLine = Math.max(1, Math.floor(line));
    const doc = await vscode.workspace.openTextDocument(resolved);
    const editor = await vscode.window.showTextDocument(doc);
    const lineIndex = Math.min(clampedLine - 1, doc.lineCount - 1);
    const position = new vscode.Position(lineIndex, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }

  private resolvePath(filePath: string): vscode.Uri | undefined {
    if (vscode.workspace.workspaceFolders === undefined) return undefined;
    for (const folder of vscode.workspace.workspaceFolders) {
      const candidate = vscode.Uri.joinPath(folder.uri, filePath);
      if (candidate.path.startsWith(folder.uri.path)) {
        return candidate;
      }
    }
    return undefined;
  }

  private update(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      this.panel.webview.html = wrapSvg("", getClickHandlerScript());
      return;
    }
    const svgContent = editor.document.getText();
    this.setSvgContent(svgContent);
  }
}

function sanitizeSvg(svg: string): string {
  let clean = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
  clean = clean.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  return clean;
}

function getClickHandlerScript(): string {
  return `<script>
(function() {
  var vscode = acquireVsCodeApi();
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-source-file]');
    if (el) {
      var file = el.getAttribute('data-source-file');
      var line = parseInt(el.getAttribute('data-source-line') || '0', 10);
      if (file && line >= 1) {
        vscode.postMessage({ type: 'openSource', filePath: file, line: line });
      }
    }
  });
})();
</script>`;
}

function wrapSvg(svgContent: string, script: string): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\';">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "<title>DrawSpec Preview</title>",
    "<style>",
    "  body { margin: 0; padding: 16px; background: #fff; }",
    "  svg { max-width: 100%; height: auto; }",
    "  [data-source-file] { cursor: pointer; }",
    "  [data-source-file]:hover { filter: brightness(0.95); }",
    "</style>",
    "</head>",
    "<body>",
    svgContent,
    script,
    "</body>",
    "</html>",
  ].join("\n");
}
