import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import {
  type Connection,
  createConnection,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { type CompilerOptions, compileDocument } from "./compiler";
import { toLspDiagnostics } from "./diagnostics";
import { extractDocumentSymbols } from "./symbols";

interface DocumentState {
  diagram: DiagramDocument | undefined;
  diagnostics: Diagnostic[];
}

export interface LspServerOptions {
  connection?: Connection;
  compilerOptions?: CompilerOptions;
}

export class LspServer {
  private readonly connection: Connection;
  private readonly documents: TextDocuments<TextDocument>;
  private readonly compilerOptions: CompilerOptions;
  private readonly state = new Map<string, DocumentState>();

  constructor(options: LspServerOptions = {}) {
    this.connection = options.connection ?? createConnection();
    this.compilerOptions = options.compilerOptions ?? {};
    this.documents = new TextDocuments(TextDocument);

    this.connection.onInitialize(() => ({
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Full,
        },
        documentSymbolProvider: true,
      },
    }));

    this.documents.onDidChangeContent((event) => {
      this.onDocumentChange(event.document);
    });

    this.documents.onDidClose((event) => {
      this.state.delete(event.document.uri);
    });

    this.connection.onDocumentSymbol((params) => this.onDocumentSymbol(params.textDocument.uri));

    this.documents.listen(this.connection);
  }

  processDocument(textDocument: TextDocument): DocumentState {
    const result = compileDocument(textDocument.getText(), this.compilerOptions);
    const docState: DocumentState = {
      diagram: result.document,
      diagnostics: result.diagnostics,
    };
    this.state.set(textDocument.uri, docState);
    return docState;
  }

  getState(uri: string): DocumentState | undefined {
    return this.state.get(uri);
  }

  publishDiagnosticsFor(uri: string, diagnostics: Diagnostic[]): void {
    this.connection.sendDiagnostics({
      uri,
      diagnostics: toLspDiagnostics(diagnostics),
    });
  }

  start(): void {
    this.connection.listen();
  }

  private onDocumentChange(textDocument: TextDocument): void {
    if (!isDiagramFile(textDocument.uri)) {
      return;
    }
    const docState = this.processDocument(textDocument);
    this.publishDiagnosticsFor(textDocument.uri, docState.diagnostics);
  }

  private onDocumentSymbol(uri: string) {
    const docState = this.state.get(uri);
    if (docState?.diagram === undefined) {
      return [];
    }
    return extractDocumentSymbols(docState.diagram);
  }
}

function isDiagramFile(uri: string): boolean {
  const parsed = URI.parse(uri);
  return /\.(diagram|arch|sequence)\.ts$/.test(parsed.path);
}
