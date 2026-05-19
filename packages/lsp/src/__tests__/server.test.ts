import { describe, expect, test } from "bun:test";
import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import { compileDocument, validateDocument } from "../compiler";
import { toLspDiagnostics } from "../diagnostics";
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
    const nodeNames = symbols.filter((s) => s.kind === 5).map((s) => s.name);
    expect(nodeNames).toContain("API");
    expect(nodeNames).toContain("Worker");
  });

  test("extractDocumentSymbols returns symbols for edges", () => {
    const doc = diagram();
    const symbols = extractDocumentSymbols(doc);
    const edgeSymbols = symbols.filter((s) => s.kind === 11);
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
    const groupSymbol = symbols.find((s) => s.kind === 3 && s.name === "System");
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
    expect(noteSymbol?.kind).toBe(13);
  });

  test("extractDocumentSymbols includes title as namespace", () => {
    const doc = diagram();
    const symbols = extractDocumentSymbols(doc);
    const titleSymbol = symbols.find((s) => s.kind === 3 && s.name === "Test Diagram");
    expect(titleSymbol).toBeDefined();
  });

  test("extractDocumentSymbols uses edge arrow format when no label", () => {
    const doc = diagram({
      edges: [{ id: "edge_x", kind: "uses", sourceId: "a", targetId: "b" }],
    });
    const symbols = extractDocumentSymbols(doc);
    const edgeSymbol = symbols.find((s) => s.kind === 11);
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
