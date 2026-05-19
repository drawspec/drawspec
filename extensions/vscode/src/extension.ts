import * as vscode from "vscode";
import { PreviewManager } from "./preview";
import { DiagnosticManager } from "./diagnostics";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("DrawSpec");
  const previewManager = new PreviewManager(context, outputChannel);
  const diagnosticManager = new DiagnosticManager(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand("drawspec.preview", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }
      previewManager.openPreview(editor.document);
    }),

    vscode.commands.registerCommand("drawspec.inspect", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }
      previewManager.inspectDocument(editor.document);
    }),

    diagnosticManager,

    outputChannel
  );

  diagnosticManager.refresh();
}

export function deactivate(): void {}
