import * as vscode from "vscode";
import { PreviewPanel } from "./preview";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("drawspec.preview", () => {
      PreviewPanel.create(context.extensionUri);
    })
  );
}

export function deactivate(): void {}
