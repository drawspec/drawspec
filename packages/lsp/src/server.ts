import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import {
  type Connection,
  createConnection,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { type CompilerOptions, compileDocument, evaluateSource } from "./compiler";
import { provideCompletionList } from "./completion";
import { provideDefinition } from "./definition";
import { toLspDiagnostics } from "./diagnostics";
import { provideHover } from "./hover";
import { extractDocumentSymbols } from "./symbols";

interface DocumentState {
  diagram: DiagramDocument | undefined;
  diagnostics: Diagnostic[];
}

export interface LspServerOptions {
  connection?: Connection;
  compilerOptions?: CompilerOptions;
  /** Root path of the DrawSpec monorepo, used for go-to-definition resolution */
  rootPath?: string;
}

export class LspServer {
  private readonly connection: Connection;
  private readonly documents: TextDocuments<TextDocument>;
  private readonly compilerOptions: CompilerOptions;
  private readonly rootPath: string | undefined;
  private readonly state = new Map<string, DocumentState>();

  constructor(options: LspServerOptions = {}) {
    this.connection = options.connection ?? createConnection();
    this.compilerOptions = options.compilerOptions ?? {};
    this.rootPath = options.rootPath;
    this.documents = new TextDocuments(TextDocument);

    this.connection.onInitialize(() => ({
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Full,
        },
        completionProvider: {
          triggerCharacters: [".", "'", '"', "/"],
        },
        hoverProvider: true,
        documentSymbolProvider: true,
        definitionProvider: true,
      },
    }));

    this.documents.onDidChangeContent((event) => {
      this.onDocumentChange(event.document);
    });

    this.documents.onDidClose((event) => {
      this.publishDiagnosticsFor(event.document.uri, []);
      this.state.delete(event.document.uri);
    });

    this.connection.onDocumentSymbol((params) => this.onDocumentSymbol(params.textDocument.uri));

    this.connection.onCompletion((params) => {
      const textDocument = this.documents.get(params.textDocument.uri);
      if (textDocument === undefined) return { isIncomplete: false, items: [] };
      return this.onCompletion(textDocument, params.position);
    });

    this.connection.onHover((params) => {
      const textDocument = this.documents.get(params.textDocument.uri);
      if (textDocument === undefined) return undefined;
      return this.onHover(textDocument, params.position);
    });

    this.connection.onDefinition((params) => {
      const textDocument = this.documents.get(params.textDocument.uri);
      if (textDocument === undefined) return undefined;
      return this.onDefinition(textDocument, params.position, params.textDocument.uri);
    });

    this.documents.listen(this.connection);
  }

  async processDocument(textDocument: TextDocument): Promise<DocumentState> {
    const filePath = URI.parse(textDocument.uri).fsPath;
    const evaluated = await evaluateSource(textDocument.getText(), filePath);
    const result = compileDocument(evaluated, this.compilerOptions);
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

  private onCompletion(textDocument: TextDocument, position: { line: number; character: number }) {
    return provideCompletionList(textDocument.getText(), position);
  }

  private onHover(textDocument: TextDocument, position: { line: number; character: number }) {
    return provideHover(textDocument.getText(), position);
  }

  private onDefinition(
    textDocument: TextDocument,
    position: { line: number; character: number },
    uri: string
  ) {
    return provideDefinition(uri, textDocument.getText(), position, this.rootPath);
  }

  private async onDocumentChange(textDocument: TextDocument): Promise<void> {
    if (!isDiagramFile(textDocument.uri)) {
      return;
    }
    const docState = await this.processDocument(textDocument);
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
