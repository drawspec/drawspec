import * as vscode from "vscode";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import * as ts from "typescript";
import type { Diagnostic, DiagramDocument } from "@drawspec/core";

export class DiagnosticManager implements vscode.Disposable {
  readonly #collection: vscode.DiagnosticCollection;
  readonly #outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.#collection = vscode.languages.createDiagnosticCollection("drawspec");
    this.#outputChannel = outputChannel;
  }

  async refresh(): Promise<void> {
    this.#collection.clear();

    const config = vscode.workspace.getConfiguration("drawspec");
    const patterns = config.get<string[]>("diagramFilePatterns") ?? [];
    if (patterns.length === 0) {
      return;
    }

    const files = await vscode.workspace.findFiles(
      `{${patterns.join(",")}}`,
      "**/node_modules/**"
    );

    for (const uri of files) {
      const diagnostics = await this.#checkFile(uri);
      if (diagnostics.length > 0) {
        this.#collection.set(uri, diagnostics);
      }
    }
  }

  async #checkFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
    if (!vscode.workspace.isTrusted) {
      return [];
    }

    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const source = document.getText();
      const result = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      });

      const tempFile = path.join(
        os.tmpdir(),
        `drawspec-diag-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`
      );

      await fs.writeFile(tempFile, result.outputText);
      try {
        const module: Record<string, unknown> = await import(tempFile);
        const doc = this.#extractDiagram(module);
        if (doc === undefined) {
          return [];
        }
        return this.#toVscodeDiagnostics(doc.diagnostics ?? []);
      } finally {
        await fs.unlink(tempFile).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#outputChannel.appendLine(
        `[DrawSpec] Diagnostic error for ${uri.fsPath}: ${message}`
      );
      return [];
    }
  }

  #extractDiagram(
    module: Record<string, unknown>
  ): DiagramDocument | undefined {
    const exported =
      module["default"] ?? module["diagram"] ?? module["doc"];
    if (this.#isDiagramDocument(exported)) {
      return exported;
    }

    for (const value of Object.values(module)) {
      if (this.#isDiagramDocument(value)) {
        return value as DiagramDocument;
      }
    }

    return undefined;
  }

  #isDiagramDocument(value: unknown): value is DiagramDocument {
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

  #toVscodeDiagnostics(diagnostics: Diagnostic[]): vscode.Diagnostic[] {
    return diagnostics.map((diag) => {
      const range = this.#sourceRange(diag);
      const severity = this.#severity(diag.severity);
      const vsDiag = new vscode.Diagnostic(range, diag.message, severity);
      vsDiag.source = "drawspec";
      vsDiag.code = diag.code;
      return vsDiag;
    });
  }

  #sourceRange(diag: Diagnostic): vscode.Range {
    if (diag.source !== undefined) {
      const line = Math.max(0, diag.source.line - 1);
      const col = Math.max(0, diag.source.column - 1);
      const pos = new vscode.Position(line, col);
      return new vscode.Range(pos, pos);
    }
    return new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0)
    );
  }

  #severity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case "error":
        return vscode.DiagnosticSeverity.Error;
      case "warning":
        return vscode.DiagnosticSeverity.Warning;
      case "info":
        return vscode.DiagnosticSeverity.Information;
      case "hint":
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Error;
    }
  }

  dispose(): void {
    this.#collection.dispose();
  }
}
