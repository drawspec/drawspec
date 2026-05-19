import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { exportToD2 } from "../d2-exporter";

function makeDoc(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    schemaVersion: "1",
    id: "test",
    kind: "graph",
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    ...overrides,
  };
}

describe("exportToD2", () => {
  test("empty document produces minimal output", () => {
    const doc = makeDoc();
    const result = exportToD2(doc);
    expect(result).toBe("\n");
  });

  test("exports nodes with labels", () => {
    const doc = makeDoc({
      nodes: [
        { id: "a", kind: "default", label: "Alice" },
        { id: "b", kind: "default", label: "Bob" },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("a: Alice");
    expect(result).toContain("b: Bob");
  });

  test("exports edges with labels and arrows", () => {
    const doc = makeDoc({
      nodes: [
        { id: "a", kind: "default" },
        { id: "b", kind: "default" },
      ],
      edges: [
        {
          id: "e1",
          kind: "default",
          sourceId: "a",
          targetId: "b",
          label: "knows",
        },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("a -> b: knows");
  });

  test("exports undirected edges", () => {
    const doc = makeDoc({
      nodes: [
        { id: "x", kind: "default" },
        { id: "y", kind: "default" },
      ],
      edges: [
        {
          id: "e1",
          kind: "default",
          sourceId: "x",
          targetId: "y",
          direction: "none",
        },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("x -- y");
  });

  test("exports layout direction", () => {
    const doc = makeDoc({
      layout: { direction: "lr" },
    });
    const result = exportToD2(doc);
    expect(result).toContain("direction: right");
  });

  test("exports node shapes from kind", () => {
    const doc = makeDoc({
      nodes: [{ id: "db", kind: "cylinder", label: "Database" }],
    });
    const result = exportToD2(doc);
    expect(result).toContain("db: Database");
    expect(result).toContain("db.shape: cylinder");
  });

  test("exports groups with child nodes", () => {
    const doc = makeDoc({
      nodes: [
        { id: "a", kind: "default", label: "Alpha" },
        { id: "b", kind: "default", label: "Beta" },
      ],
      groups: [
        {
          id: "g1",
          kind: "default",
          label: "Group1",
          childIds: ["a", "b"],
        },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("g1: {");
    expect(result).toContain("a: Alpha");
    expect(result).toContain("b: Beta");
    expect(result).toContain("}");
  });

  test("escapes labels with special characters", () => {
    const doc = makeDoc({
      nodes: [{ id: "n1", kind: "default", label: 'Hello "World"' }],
    });
    const result = exportToD2(doc);
    expect(result).toContain('n1: "Hello \\"World\\""');
  });
});
