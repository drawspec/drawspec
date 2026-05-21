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
    this.panel.webview.onDidReceiveMessage((msg: PreviewMessage) => {
      if (msg.type === "openSource") {
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
    const script = getClickHandlerScript();
    this.panel.webview.html = wrapSvg(svgContent, script);
  }

  private async openSource(filePath: string, line: number): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    const editor = await vscode.window.showTextDocument(doc);
    const position = new vscode.Position(line - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
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

interface PreviewMessage {
  type: "openSource";
  filePath: string;
  line: number;
}

function getClickHandlerScript(): string {
  return `<script>
(function() {
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-source-file]');
    if (el) {
      var file = el.getAttribute('data-source-file');
      var line = parseInt(el.getAttribute('data-source-line') || '0', 10);
      if (file) {
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
