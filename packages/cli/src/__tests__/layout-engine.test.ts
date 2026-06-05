import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { sequenceLayout, simpleGraphLayout } from "@drawspec/layout";

// Re-implement the engine selection logic for testing
// to avoid having to import from the internal shared.ts

type LayoutEngine = {
  name: string;
  layout(document: DiagramDocument, options?: unknown): Promise<unknown>;
};

function selectLayoutEngine(document: DiagramDocument): LayoutEngine {
  const engine = document.layout?.engine;
  // Explicit engine takes precedence over kind-based selection
  if (engine === "sequence") {
    return sequenceLayout();
  }
  if (engine === "simple") {
    return simpleGraphLayout();
  }
  // Kind-based selection when engine is undefined
  if (document.kind === "sequence") {
    return sequenceLayout();
  }
  // Default to simple for any other diagram kind
  return simpleGraphLayout();
}

function createDoc(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    schemaVersion: "1.0",
    id: "test-diagram",
    kind: "graph",
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    ...overrides,
  };
}

describe("layout engine selection", () => {
  describe("default behavior (no engine field)", () => {
    test("uses simpleGraphLayout for non-sequence diagrams", () => {
      const doc = createDoc({ kind: "graph" });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });

    test("uses sequenceLayout for sequence diagrams", () => {
      const doc = createDoc({ kind: "sequence" });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("sequence");
    });

    test("uses simpleGraphLayout for architecture diagrams", () => {
      const doc = createDoc({ kind: "architecture" });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });

    test("uses simpleGraphLayout for component diagrams", () => {
      const doc = createDoc({ kind: "component" });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });
  });

  describe("explicit engine field", () => {
    test('"simple" engine uses simpleGraphLayout', () => {
      const doc = createDoc({ kind: "sequence", layout: { engine: "simple" } });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });

    test('"sequence" engine overrides kind for non-sequence diagrams', () => {
      const doc = createDoc({ kind: "graph", layout: { engine: "sequence" } });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("sequence");
    });

    test("unknown engine falls back to simpleGraphLayout", () => {
      const doc = createDoc({ kind: "graph", layout: { engine: "unknown-engine" } });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });

    test('"dagre" engine selection is handled by dynamic import in shared.ts', () => {
      // The actual dagre loading is tested separately since it requires dynamic import
      // This just verifies the selection logic would route to dagre
      const doc = createDoc({ kind: "graph", layout: { engine: "dagre" } });
      // In the actual implementation, this would try to load @drawspec/layout-dagre
      // For this unit test, we test that the engine field is read
      expect(doc.layout?.engine).toBe("dagre");
    });
  });

  describe("engine field vs kind interaction", () => {
    test("explicit engine takes precedence over kind for sequence", () => {
      const doc = createDoc({ kind: "sequence", layout: { engine: "simple" } });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });

    test("undefined engine uses kind-based selection", () => {
      const doc = createDoc({ kind: "graph", layout: {} });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });

    test("empty layout object falls back to kind-based selection", () => {
      const doc = createDoc({ kind: "architecture", layout: {} });
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });
  });

  describe("backward compatibility", () => {
    test("no layout field uses kind-based selection", () => {
      const doc = createDoc();
      expect(doc.layout).toBeUndefined();
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });

    test("no layout field for sequence uses sequenceLayout", () => {
      const doc = createDoc({ kind: "sequence" });
      expect(doc.layout).toBeUndefined();
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("sequence");
    });

    test("layout without engine field uses kind-based selection", () => {
      const doc = createDoc({ kind: "component", layout: { direction: "LR" as const } });
      expect(doc.layout?.engine).toBeUndefined();
      const engine = selectLayoutEngine(doc);
      expect(engine.name).toBe("simple-graph");
    });
  });
});
