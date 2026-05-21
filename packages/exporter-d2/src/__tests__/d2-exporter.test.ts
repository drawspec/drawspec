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

  test("exports backward edges", () => {
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
          direction: "backward",
        },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("a <- b");
  });

  test("exports bidirectional edges", () => {
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
          direction: "bidirectional",
          label: "sync",
        },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("a <> b: sync");
  });

  test("exports layout direction", () => {
    const doc = makeDoc({
      layout: { direction: "lr" },
    });
    const result = exportToD2(doc);
    expect(result).toContain("direction: right");
  });

  test("does not emit direction from title", () => {
    const doc = makeDoc({ title: "My Diagram" });
    const result = exportToD2(doc);
    expect(result).not.toContain("direction: right");
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
    expect(result).toContain("g1: Group1 {");
    expect(result).toContain("a: Alpha");
    expect(result).toContain("b: Beta");
    expect(result).toContain("}");
  });

  test("exports group description as tooltip", () => {
    const doc = makeDoc({
      groups: [
        {
          id: "g1",
          kind: "default",
          label: "My Group",
          description: "A group description",
          childIds: [],
        },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("g1: My Group {");
    expect(result).toContain("tooltip: A group description");
  });

  test("exports nested groups with parentId", () => {
    const doc = makeDoc({
      nodes: [
        { id: "a", kind: "default", label: "Alpha" },
        { id: "b", kind: "default", label: "Beta" },
        { id: "c", kind: "default", label: "Gamma" },
      ],
      groups: [
        {
          id: "outer",
          kind: "default",
          label: "Outer",
          childIds: ["a"],
        },
        {
          id: "inner",
          kind: "default",
          label: "Inner",
          parentId: "outer",
          childIds: ["b", "c"],
        },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("outer: Outer {");
    expect(result).toContain("inner: Inner {");
    expect(result).toContain("a: Alpha");
    expect(result).toContain("b: Beta");
    expect(result).toContain("c: Gamma");
    const outerOpen = result.indexOf("outer: Outer {");
    const innerOpen = result.indexOf("inner: Inner {");
    expect(innerOpen).toBeGreaterThan(outerOpen);
    const innerClose = result.indexOf("}", innerOpen);
    const outerClose = result.indexOf("}", innerClose + 1);
    expect(outerClose).toBeGreaterThan(innerClose);
  });

  test("escapes labels with special characters", () => {
    const doc = makeDoc({
      nodes: [{ id: "n1", kind: "default", label: 'Hello "World"' }],
    });
    const result = exportToD2(doc);
    expect(result).toContain('n1: "Hello \\"World\\""');
  });

  test("nodes with parentId are nested inside parent node", () => {
    const doc = makeDoc({
      nodes: [
        { id: "parent", kind: "default", label: "Parent" },
        { id: "child", kind: "default", label: "Child", parentId: "parent" },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("parent: Parent {");
    expect(result).toContain("child: Child");
    const parentOpen = result.indexOf("parent: Parent {");
    const childLine = result.indexOf("child: Child");
    const parentClose = result.indexOf("}", childLine);
    expect(childLine).toBeGreaterThan(parentOpen);
    expect(parentClose).toBeGreaterThan(childLine);
  });

  test("disambiguates colliding IDs", () => {
    const doc = makeDoc({
      nodes: [
        { id: "a-b", kind: "default", label: "Node1" },
        { id: "a_b", kind: "default", label: "Node2" },
      ],
    });
    const result = exportToD2(doc);
    expect(result).toContain("a_b: Node1");
    expect(result).toContain("a_b_1: Node2");
  });
});
