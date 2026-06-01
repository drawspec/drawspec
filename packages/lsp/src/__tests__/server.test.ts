import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import type { Connection } from "vscode-languageserver/node";
import { SymbolKind } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { compileDocument, validateDocument } from "../compiler";
import { toLspDiagnostics } from "../diagnostics";
import { LspServer } from "../server";
import { extractDocumentSymbols } from "../symbols";

function diagram(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    schemaVersion: "1.0.0",
    id: "test_diagram",
    title: "Test Diagram",
    kind: "architecture",
    nodes: [
      { id: "node_a", kind: "container", label: "API" },
      { id: "node_b", kind: "container", label: "Worker" },
    ],
    edges: [
      { id: "edge_a_b", kind: "uses", sourceId: "node_a", targetId: "node_b", label: "Calls" },
    ],
    groups: [],
    annotations: [],
    ...overrides,
  };
}

describe("compiler", () => {
  test("validateDocument returns empty diagnostics for valid diagram", () => {
    const doc = diagram();
    const diagnostics = validateDocument(doc);
    expect(diagnostics).toHaveLength(0);
  });

  test("validateDocument reports missing title", () => {
    const doc = diagram({ title: " " });
    const diagnostics = validateDocument(doc);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.code === "diagram/require-title")).toBe(true);
  });

  test("compileDocument extracts DiagramDocument from plain object", () => {
    const doc = diagram();
    const result = compileDocument(doc);
    expect(result.document).toBeDefined();
    expect(result.document?.id).toBe("test_diagram");
  });

  test("compileDocument extracts from factory function", () => {
    const doc = diagram();
    const result = compileDocument(() => doc);
    expect(result.document).toBeDefined();
    expect(result.document?.id).toBe("test_diagram");
  });

  test("compileDocument returns error for non-diagram value", () => {
    const result = compileDocument("not a diagram");
    expect(result.document).toBeUndefined();
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("drawspec/lsp");
  });

  test("compileDocument extracts from { default: doc }", () => {
    const doc = diagram();
    const result = compileDocument({ default: doc });
    expect(result.document).toBeDefined();
    expect(result.document?.id).toBe("test_diagram");
  });

  test("compileDocument runs validation on extracted document", () => {
    const doc = diagram({ title: " " });
    const result = compileDocument(doc);
    expect(result.diagnostics.some((d) => d.code === "diagram/require-title")).toBe(true);
  });
});

describe("diagnostics", () => {
  test("toLspDiagnostics converts severity correctly", () => {
    const diagnostics: Diagnostic[] = [
      { code: "test/error", severity: "error", message: "err" },
      { code: "test/warn", severity: "warning", message: "warn" },
      { code: "test/info", severity: "info", message: "info" },
      { code: "test/hint", severity: "hint", message: "hint" },
    ];
    const lsp = toLspDiagnostics(diagnostics);
    expect(lsp).toHaveLength(4);
    expect(lsp[0]?.severity).toBe(1);
    expect(lsp[1]?.severity).toBe(2);
    expect(lsp[2]?.severity).toBe(3);
    expect(lsp[3]?.severity).toBe(4);
  });

  test("toLspDiagnostics uses source for range", () => {
    const diagnostics: Diagnostic[] = [
      {
        code: "test",
        severity: "error",
        message: "test",
        source: { file: "test.ts", line: 5, column: 10 },
      },
    ];
    const lsp = toLspDiagnostics(diagnostics);
    expect(lsp[0]?.range.start.line).toBe(4);
    expect(lsp[0]?.range.start.character).toBe(9);
  });

  test("toLspDiagnostics defaults to line 0 for no source", () => {
    const diagnostics: Diagnostic[] = [{ code: "test", severity: "error", message: "test" }];
    const lsp = toLspDiagnostics(diagnostics);
    expect(lsp[0]?.range.start.line).toBe(0);
    expect(lsp[0]?.source).toBe("drawspec");
  });
});

describe("symbols", () => {
  test("extractDocumentSymbols returns symbols for nodes", () => {
    const doc = diagram();
    const symbols = extractDocumentSymbols(doc);
    const nodeNames = symbols.filter((s) => s.kind === SymbolKind.Class).map((s) => s.name);
    expect(nodeNames).toContain("API");
    expect(nodeNames).toContain("Worker");
  });

  test("extractDocumentSymbols returns symbols for edges", () => {
    const doc = diagram();
    const symbols = extractDocumentSymbols(doc);
    const edgeSymbols = symbols.filter((s) => s.kind === SymbolKind.Interface);
    expect(edgeSymbols).toHaveLength(1);
    expect(edgeSymbols[0]?.name).toBe("Calls");
  });

  test("extractDocumentSymbols returns symbols for groups with children", () => {
    const doc = diagram({
      groups: [
        {
          id: "group_1",
          kind: "boundary",
          label: "System",
          childIds: ["node_a", "node_b"],
        },
      ],
    });
    const symbols = extractDocumentSymbols(doc);
    const groupSymbol = symbols.find((s) => s.kind === SymbolKind.Namespace && s.name === "System");
    expect(groupSymbol).toBeDefined();
    expect(groupSymbol?.children).toHaveLength(2);
    expect(groupSymbol?.children?.[0]?.name).toBe("API");
    expect(groupSymbol?.children?.[1]?.name).toBe("Worker");
  });

  test("extractDocumentSymbols returns symbols for annotations", () => {
    const doc = diagram({
      annotations: [{ id: "note_1", kind: "note", label: "Important" }],
    });
    const symbols = extractDocumentSymbols(doc);
    const noteSymbol = symbols.find((s) => s.name === "Important");
    expect(noteSymbol).toBeDefined();
    expect(noteSymbol?.kind).toBe(SymbolKind.Variable);
  });

  test("extractDocumentSymbols includes title as namespace", () => {
    const doc = diagram();
    const symbols = extractDocumentSymbols(doc);
    const titleSymbol = symbols.find(
      (s) => s.kind === SymbolKind.Namespace && s.name === "Test Diagram"
    );
    expect(titleSymbol).toBeDefined();
  });

  test("extractDocumentSymbols uses edge arrow format when no label", () => {
    const doc = diagram({
      edges: [{ id: "edge_x", kind: "uses", sourceId: "a", targetId: "b" }],
    });
    const symbols = extractDocumentSymbols(doc);
    const edgeSymbol = symbols.find((s) => s.kind === SymbolKind.Interface);
    expect(edgeSymbol?.name).toBe("a → b");
  });

  test("extractDocumentSymbols uses source ref for range", () => {
    const doc = diagram({
      nodes: [
        {
          id: "sourced",
          kind: "container",
          label: "Sourced",
          source: { file: "test.ts", line: 10, column: 5 },
        },
      ],
      edges: [],
    });
    const symbols = extractDocumentSymbols(doc);
    const sourced = symbols.find((s) => s.name === "Sourced");
    expect(sourced?.range.start.line).toBe(9);
    expect(sourced?.range.start.character).toBe(4);
  });
});

const TEST_TMP = join(tmpdir(), "drawspec-lsp-test");

const VALID_SOURCE = `
export default {
  schemaVersion: "1.0.0",
  id: "integration_test",
  title: "Integration Test",
  kind: "architecture",
  nodes: [
    { id: "svc", kind: "container", label: "Service" },
  ],
  edges: [],
  groups: [],
  annotations: [],
};
`;

const INVALID_SOURCE = `export default "not a diagram";`;

function createMockConnection() {
  const sentDiagnostics: Array<{ uri: string; diagnostics: unknown[] }> = [];
  const noop = () => ({ dispose: () => {} });

  const connection = {
    onInitialize: noop,
    onDocumentSymbol: noop,
    onCompletion: noop,
    onHover: noop,
    onDefinition: noop,
    sendDiagnostics: (params: { uri: string; diagnostics: unknown[] }) => {
      sentDiagnostics.push(params);
    },
    listen: () => {},
    onDidOpenTextDocument: noop,
    onDidChangeTextDocument: noop,
    onDidCloseTextDocument: noop,
    onWillSaveTextDocument: noop,
    onWillSaveTextDocumentWaitUntil: noop,
    onDidSaveTextDocument: noop,
  } as unknown as Connection;

  return { connection, sentDiagnostics };
}

describe("LspServer integration", () => {
  beforeAll(() => {
    mkdirSync(TEST_TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_TMP, { recursive: true, force: true });
  });

  test("processDocument evaluates valid source and returns state with diagram", async () => {
    const filePath = join(TEST_TMP, "valid.diagram.ts");
    writeFileSync(filePath, VALID_SOURCE);

    const { connection } = createMockConnection();
    const server = new LspServer({ connection });

    const doc = TextDocument.create(`file://${filePath}`, "typescript", 1, VALID_SOURCE);
    const state = await server.processDocument(doc);

    expect(state.diagram).toBeDefined();
    expect(state.diagram?.id).toBe("integration_test");
  });

  test("processDocument returns diagnostics for invalid source", async () => {
    const filePath = join(TEST_TMP, "invalid.diagram.ts");
    writeFileSync(filePath, INVALID_SOURCE);

    const { connection } = createMockConnection();
    const server = new LspServer({ connection });

    const doc = TextDocument.create(`file://${filePath}`, "typescript", 1, INVALID_SOURCE);
    const state = await server.processDocument(doc);

    expect(state.diagram).toBeUndefined();
    expect(state.diagnostics.length).toBeGreaterThan(0);
    expect(state.diagnostics[0]?.code).toBe("drawspec/lsp");
  });

  test("publishDiagnosticsFor sends diagnostics via connection", () => {
    const { connection, sentDiagnostics } = createMockConnection();
    const server = new LspServer({ connection });

    server.publishDiagnosticsFor("file:///test.ts", []);

    expect(sentDiagnostics).toHaveLength(1);
    expect(sentDiagnostics[0]?.uri).toBe("file:///test.ts");
    expect(sentDiagnostics[0]?.diagnostics).toEqual([]);
  });

  test("publishDiagnosticsFor sends converted diagnostics", () => {
    const { connection, sentDiagnostics } = createMockConnection();
    const server = new LspServer({ connection });

    const coreDiag: Diagnostic = {
      code: "test/error",
      severity: "error",
      message: "Something went wrong",
      source: { file: "a.ts", line: 3, column: 5 },
    };

    server.publishDiagnosticsFor("file:///a.ts", [coreDiag]);

    expect(sentDiagnostics).toHaveLength(1);
    expect(sentDiagnostics[0]?.diagnostics).toHaveLength(1);
    const lspDiag = (sentDiagnostics[0]?.diagnostics as Array<Record<string, unknown>>)[0];
    expect(lspDiag.severity).toBe(1);
    expect(lspDiag.message).toBe("Something went wrong");
    expect(lspDiag.source).toBe("drawspec");
  });

  test("getState returns undefined for unknown document", () => {
    const { connection } = createMockConnection();
    const server = new LspServer({ connection });

    expect(server.getState("file:///unknown.ts")).toBeUndefined();
  });

  test("getState returns state after processing", async () => {
    const filePath = join(TEST_TMP, "state.diagram.ts");
    writeFileSync(filePath, VALID_SOURCE);

    const { connection } = createMockConnection();
    const server = new LspServer({ connection });

    const doc = TextDocument.create(`file://${filePath}`, "typescript", 1, VALID_SOURCE);
    await server.processDocument(doc);

    const state = server.getState(`file://${filePath}`);
    expect(state).toBeDefined();
    expect(state?.diagram?.id).toBe("integration_test");
  });
});
