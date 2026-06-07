import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/layout";
import { forceLayout } from "../index";

function doc(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    schemaVersion: "1.0.0",
    id: "doc",
    kind: "graph",
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    ...overrides,
  } as DiagramDocument;
}

const graphDoc = doc({
  id: "graph",
  nodes: [
    { id: "b", kind: "component", label: "B" },
    { id: "a", kind: "component", label: "A" },
    { id: "c", kind: "component", label: "C" },
    { id: "d", kind: "component", label: "D" },
  ],
  edges: [
    { id: "e2", kind: "depends-on", sourceId: "b", targetId: "c" },
    { id: "e1", kind: "depends-on", sourceId: "a", targetId: "b" },
    { id: "e3", kind: "depends-on", sourceId: "a", targetId: "d" },
  ],
});

const sequenceDoc = doc({
  id: "seq",
  kind: "sequence",
  nodes: [{ id: "user", kind: "actor", label: "User" }],
});

describe("force layout", () => {
  test("implements LayoutEngine for non-sequence documents", () => {
    const engine = forceLayout();
    expect(engine.name).toBe("force");
    expect(engine.supports(graphDoc)).toBe(true);
    expect(engine.supports(sequenceDoc)).toBe(false);
  });

  test("handles an empty diagram", async () => {
    const positioned = await forceLayout().layout(doc());
    expect(positioned.nodes).toEqual([]);
    expect(positioned.edges).toEqual([]);
    expect(positioned.groups).toEqual([]);
    expect(positioned.activations).toEqual([]);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("handles a single node", async () => {
    const positioned = await forceLayout().layout(doc({ nodes: [{ id: "only", kind: "node" }] }));
    expect(positioned.nodes).toHaveLength(1);
    expect(positioned.nodes[0]?.id).toBe("only");
    expect(positioned.nodes[0]?.x).toBeGreaterThanOrEqual(0);
    expect(positioned.nodes[0]?.width).toBeGreaterThan(0);
  });

  test("positions and routes a connected graph", async () => {
    const positioned = await forceLayout().layout(graphDoc);
    expect(positioned.nodes.map((node) => node.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(positioned.edges).toHaveLength(3);
    for (const edge of positioned.edges) {
      expect(edge.waypoints.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("is deterministic across engines and repeated runs", async () => {
    const first = await forceLayout().layout(graphDoc);
    const second = await forceLayout().layout(graphDoc);
    expect(first).toEqual(second);
  });

  test("honors force configuration", async () => {
    const compact = await forceLayout().layout(graphDoc, {
      force: { distance: 80, iterations: 100 },
    });
    const expanded = await forceLayout().layout(graphDoc, {
      force: { distance: 240, iterations: 100 },
    });
    expect(expanded.width + expanded.height).toBeGreaterThan(compact.width + compact.height);
  });

  test("handles disconnected components", async () => {
    const disconnected = doc({
      nodes: [
        { id: "x", kind: "node" },
        { id: "y", kind: "node" },
        { id: "z", kind: "node" },
      ],
    });
    const positioned = await forceLayout().layout(disconnected);
    expect(positioned.nodes).toHaveLength(3);
    for (const node of positioned.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  test("handles cyclic graphs and self loops", async () => {
    const cyclic = doc({
      nodes: [
        { id: "a", kind: "node" },
        { id: "b", kind: "node" },
        { id: "c", kind: "node" },
      ],
      edges: [
        { id: "e1", kind: "depends", sourceId: "a", targetId: "b" },
        { id: "e2", kind: "depends", sourceId: "b", targetId: "c" },
        { id: "e3", kind: "depends", sourceId: "c", targetId: "a" },
        { id: "loop", kind: "self", sourceId: "a", targetId: "a" },
      ],
    });
    const positioned = await forceLayout().layout(cyclic);
    expect(positioned.nodes).toHaveLength(3);
    expect(positioned.edges.find((edge) => edge.id === "loop")?.waypoints.length).toBeGreaterThan(
      2
    );
  });
});
