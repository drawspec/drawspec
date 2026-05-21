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
      { enableScripts: false, retainContextWhenHidden: true }
    );

    this.#panels.set(uri, panel);

    const saveSubscription = vscode.workspace.onDidSaveTextDocument(
      async (saved) => {
        if (saved.uri.toString() === uri) {
          await this.#renderPreview(panel, saved);
        }
      }
    );

    panel.onDidDispose(() => {
      this.#panels.delete(uri);
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
  const stripped = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  return stripped;
}

function previewHtml(svgContent: string): string {
  const sanitized = sanitizeSvg(svgContent);
  const encoded = encodeURIComponent(sanitized);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DrawSpec Preview</title>
<style>
  body { margin: 0; padding: 16px; background: #1e1e1e; color: #ccc; display: flex; justify-content: center; }
  .container { max-width: 100%; overflow: auto; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<div class="container"><img src="data:image/svg+xml,${encoded}" alt="DrawSpec Diagram" /></div>
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
