import * as vscode from "vscode";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import * as ts from "typescript";
import { serializeDocument } from "@drawspec/core";
import type { DiagramDocument } from "@drawspec/core";
import { SimpleGraphLayoutEngine, SequenceLayoutEngine } from "@drawspec/layout";
import { renderSvgSync } from "@drawspec/renderer-svg";

export class PreviewManager {
  readonly #outputChannel: vscode.OutputChannel;
  readonly #panels = new Map<string, vscode.WebviewPanel>();
  readonly #documentUris = new Map<string, vscode.Uri>();

  constructor(
    _context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.#outputChannel = outputChannel;
  }

  async openPreview(document: vscode.TextDocument): Promise<void> {
    const uri = document.uri.toString();
    const existing = this.#panels.get(uri);
    if (existing !== undefined) {
      existing.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "drawspec-preview",
      `Preview: ${document.uri.path.split("/").pop() ?? "diagram"}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.#panels.set(uri, panel);
    this.#documentUris.set(uri, document.uri);

    panel.webview.onDidReceiveMessage((message: unknown) => {
      this.#handleWebviewMessage(uri, message);
    });

    const saveSubscription = vscode.workspace.onDidSaveTextDocument(
      async (saved) => {
        if (saved.uri.toString() === uri) {
          await this.#renderPreview(panel, saved);
        }
      }
    );

    panel.onDidDispose(() => {
      this.#panels.delete(uri);
      this.#documentUris.delete(uri);
      saveSubscription.dispose();
    });

    await this.#renderPreview(panel, document);
  }

  async inspectDocument(document: vscode.TextDocument): Promise<void> {
    const doc = await this.#compileDocument(document);
    if (doc === undefined) {
      return;
    }

    this.#outputChannel.clear();
    this.#outputChannel.appendLine(
      `[DrawSpec] IR for ${document.uri.path.split("/").pop() ?? "diagram"}`
    );
    this.#outputChannel.appendLine(serializeDocument(doc));
    this.#outputChannel.show(true);
  }

  async #renderPreview(
    panel: vscode.WebviewPanel,
    document: vscode.TextDocument
  ): Promise<void> {
    const doc = await this.#compileDocument(document);
    if (doc === undefined) {
      panel.webview.html = errorHtml("Failed to compile diagram");
      return;
    }

    if (doc.diagnostics !== undefined && doc.diagnostics.length > 0) {
      const messages = doc.diagnostics
        .map((d) => `[${d.severity}] ${d.message}`)
        .join("\n");
      panel.webview.html = errorHtml(messages);
      return;
    }

    const svg = await this.#renderSvg(doc);
    panel.webview.html = previewHtml(svg);
  }

  async #compileDocument(
    document: vscode.TextDocument
  ): Promise<DiagramDocument | undefined> {
    if (!vscode.workspace.isTrusted) {
      this.#outputChannel.appendLine(
        "[DrawSpec] Cannot compile diagram: workspace is not trusted"
      );
      return undefined;
    }

    try {
      const source = document.getText();
      const result = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      });

      const tempDir = os.tmpdir();
      const tempFile = path.join(
        tempDir,
        `drawspec-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`
      );

      await fs.writeFile(tempFile, result.outputText);
      try {
        const module: Record<string, unknown> = await import(tempFile);
        const exported =
          module["default"] ?? module["diagram"] ?? module["doc"];
        if (isDiagramDocument(exported)) {
          return exported;
        }

        const values = Object.values(module);
        for (const value of values) {
          if (isDiagramDocument(value)) {
            return value;
          }
        }

        this.#outputChannel.appendLine(
          `[DrawSpec] No DiagramDocument export found in ${document.uri.fsPath}`
        );
        return undefined;
      } finally {
        await fs.unlink(tempFile).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#outputChannel.appendLine(
        `[DrawSpec] Compilation error: ${message}`
      );
      return undefined;
    }
  }

  async #renderSvg(doc: DiagramDocument): Promise<string> {
    const engine =
      doc.kind === "sequence"
        ? new SequenceLayoutEngine()
        : new SimpleGraphLayoutEngine();

    const positioned = await engine.layout(doc);
    return renderSvgSync(doc, { positionedDiagram: positioned });
  }

  #handleWebviewMessage(panelUri: string, message: unknown): void {
    if (
      typeof message !== "object" ||
      message === null ||
      (message as Record<string, unknown>)["command"] !== "openSource"
    ) {
      return;
    }

    const msg = message as Record<string, unknown>;
    const rawFile = msg["file"];
    const rawLine = msg["line"];
    if (typeof rawFile !== "string" || typeof rawLine !== "number") return;

    const file = rawFile;
    const line = Math.max(0, Math.trunc(rawLine) - 1);
    const column = Math.max(0, Math.trunc((msg["column"] as number | undefined) ?? 1) - 1);

    const docUri = this.#documentUris.get(panelUri);
    if (docUri === undefined) return;

    const targetPath = path.isAbsolute(file)
      ? file
      : path.resolve(path.dirname(docUri.fsPath), file);

    const targetUri = vscode.Uri.file(targetPath);
    vscode.workspace.openTextDocument(targetUri).then(
      (doc) => {
        void vscode.window.showTextDocument(doc, {
          selection: new vscode.Range(line, column, line, column),
        });
      },
      (err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        this.#outputChannel.appendLine(`[DrawSpec] Failed to open source: ${detail}`);
      }
    );
  }
}

function isDiagramDocument(value: unknown): value is DiagramDocument {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["schemaVersion"] === "string" &&
    typeof obj["id"] === "string" &&
    typeof obj["kind"] === "string" &&
    Array.isArray(obj["nodes"]) &&
    Array.isArray(obj["edges"])
  );
}

function sanitizeSvg(svg: string): string {
  const noXmlDecl = svg.replace(/<\?xml[^?]*\?>\s*/g, "");
  const noScripts = noXmlDecl.replace(/<script[\s\S]*?<\/script>/gi, "");
  const noEventHandlers = noScripts.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  return noEventHandlers;
}

function previewHtml(svgContent: string): string {
  const sanitized = sanitizeSvg(svgContent);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DrawSpec Preview</title>
<style>
  body { margin: 0; padding: 16px; background: #1e1e1e; color: #ccc; display: flex; justify-content: center; }
  .container { max-width: 100%; overflow: auto; }
  svg { max-width: 100%; height: auto; cursor: default; }
  [data-source-file] { cursor: pointer; }
  [data-source-file]:hover { filter: brightness(1.2); }
</style>
</head>
<body>
<div class="container">${sanitized}</div>
<script>
  const vscode = acquireVsCodeApi();
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-source-file]");
    if (!el) return;
    const file = el.getAttribute("data-source-file");
    const line = el.getAttribute("data-source-line");
    if (file && line) {
      vscode.postMessage({
        command: "openSource",
        file,
        line: Number(line),
        column: el.hasAttribute("data-source-column")
          ? Number(el.getAttribute("data-source-column"))
          : undefined,
      });
    }
  });
</script>
</body>
</html>`;
}

function errorHtml(message: string): string {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DrawSpec Preview</title>
<style>
  body { margin: 0; padding: 16px; background: #1e1e1e; color: #f48771; font-family: sans-serif; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
</style>
</head>
<body>
<h3>DrawSpec Error</h3>
<pre>${escaped}</pre>
</body>
</html>`;
}
