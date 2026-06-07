import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/layout";
import { treeLayout } from "../index";

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

const treeDoc = doc({
  id: "tree",
  nodes: [
    { id: "root", kind: "component", label: "Root" },
    { id: "left", kind: "component", label: "Left" },
    { id: "right", kind: "component", label: "Right" },
    { id: "leaf", kind: "component", label: "Leaf" },
  ],
  edges: [
    { id: "e1", kind: "contains", sourceId: "root", targetId: "left" },
    { id: "e2", kind: "contains", sourceId: "root", targetId: "right" },
    { id: "e3", kind: "contains", sourceId: "left", targetId: "leaf" },
  ],
});

const sequenceDoc = doc({
  id: "seq",
  kind: "sequence",
  nodes: [{ id: "user", kind: "actor", label: "User" }],
});

describe("tree layout", () => {
  test("implements LayoutEngine for non-sequence documents", () => {
    const engine = treeLayout();
    expect(engine.name).toBe("tree");
    expect(engine.supports(treeDoc)).toBe(true);
    expect(engine.supports(sequenceDoc)).toBe(false);
  });

  test("handles an empty diagram", async () => {
    const positioned = await treeLayout().layout(doc());
    expect(positioned.nodes).toEqual([]);
    expect(positioned.edges).toEqual([]);
    expect(positioned.groups).toEqual([]);
    expect(positioned.activations).toEqual([]);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("handles a single node", async () => {
    const positioned = await treeLayout().layout(doc({ nodes: [{ id: "only", kind: "node" }] }));
    expect(positioned.nodes).toHaveLength(1);
    expect(positioned.nodes[0]?.id).toBe("only");
    expect(positioned.nodes[0]?.x).toBeGreaterThanOrEqual(0);
  });

  test("positions a top-down tree by levels", async () => {
    const positioned = await treeLayout().layout(treeDoc, { direction: "TB" });
    const byId = Object.fromEntries(positioned.nodes.map((node) => [node.id, node]));
    expect(byId["left"]?.y).toBeGreaterThan(byId["root"]?.y ?? 0);
    expect(byId["right"]?.y).toBeGreaterThan(byId["root"]?.y ?? 0);
    expect(byId["leaf"]?.y).toBeGreaterThan(byId["left"]?.y ?? 0);
  });

  test("supports all tree directions", async () => {
    const tb = await treeLayout().layout(treeDoc, { tree: { direction: "TB" } });
    const bt = await treeLayout().layout(treeDoc, { tree: { direction: "BT" } });
    const lr = await treeLayout().layout(treeDoc, { tree: { direction: "LR" } });
    const rl = await treeLayout().layout(treeDoc, { tree: { direction: "RL" } });
    expect(lr.width).toBeGreaterThan(tb.width);
    expect(rl.width).toBeGreaterThan(bt.width);
    expect(bt.nodes.find((node) => node.id === "root")?.y).toBeGreaterThan(
      bt.nodes.find((node) => node.id === "leaf")?.y ?? 0
    );
  });

  test("is deterministic across engines and repeated runs", async () => {
    const first = await treeLayout().layout(treeDoc);
    const second = await treeLayout().layout(treeDoc);
    expect(first).toEqual(second);
  });

  test("honors tree spacing configuration", async () => {
    const tight = await treeLayout().layout(treeDoc, {
      tree: { nodeSpacing: 20, levelSpacing: 40 },
    });
    const loose = await treeLayout().layout(treeDoc, {
      tree: { nodeSpacing: 160, levelSpacing: 240 },
    });
    expect(loose.width + loose.height).toBeGreaterThan(tight.width + tight.height);
  });

  test("handles disconnected components", async () => {
    const disconnected = doc({
      nodes: [
        { id: "x", kind: "node" },
        { id: "y", kind: "node" },
        { id: "z", kind: "node" },
      ],
    });
    const positioned = await treeLayout().layout(disconnected);
    expect(positioned.nodes).toHaveLength(3);
    expect(new Set(positioned.nodes.map((node) => node.x)).size).toBe(3);
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
    const positioned = await treeLayout().layout(cyclic);
    expect(positioned.nodes).toHaveLength(3);
    expect(positioned.edges.find((edge) => edge.id === "loop")?.waypoints.length).toBeGreaterThan(
      2
    );
  });
});
