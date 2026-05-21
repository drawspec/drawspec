import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/layout";
import { TypeScriptFallbackBridge } from "../fallback";
import { wasmLayout } from "../index";
import type { WasmBridge, WasmGraphInput, WasmLayoutResult } from "../wasm-bridge";

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

const graphDoc: DiagramDocument = doc({
  id: "graph",
  kind: "graph",
  nodes: [
    { id: "b", kind: "component", label: "B" },
    { id: "a", kind: "component", label: "A" },
    { id: "c", kind: "component", label: "C" },
  ],
  edges: [
    { id: "e2", kind: "depends-on", sourceId: "b", targetId: "c" },
    { id: "e1", kind: "depends-on", sourceId: "a", targetId: "b" },
  ],
}) as DiagramDocument;

const sequenceDoc: DiagramDocument = doc({
  id: "seq",
  kind: "sequence",
  nodes: [{ id: "user", kind: "actor", label: "User" }],
}) as DiagramDocument;

describe("wasm layout engine", () => {
  test("supports non-sequence documents", () => {
    const engine = wasmLayout();
    expect(engine.supports(graphDoc)).toBe(true);
    expect(engine.supports(sequenceDoc)).toBe(false);
  });

  test("engine name includes bridge name", () => {
    expect(wasmLayout().name).toBe("wasm:ts-fallback");
  });

  test("handles an empty diagram", async () => {
    const positioned = await wasmLayout().layout(doc());
    expect(positioned.nodes).toEqual([]);
    expect(positioned.edges).toEqual([]);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("handles a single node", async () => {
    const positioned = await wasmLayout().layout(doc({ nodes: [{ id: "only", kind: "node" }] }));
    expect(positioned.nodes).toHaveLength(1);
    expect(positioned.nodes[0]?.id).toBe("only");
    expect(positioned.nodes[0]?.width).toBeGreaterThan(0);
    expect(positioned.nodes[0]?.height).toBeGreaterThan(0);
  });

  test("positions nodes with edges", async () => {
    const positioned = await wasmLayout().layout(graphDoc);
    expect(positioned.nodes).toHaveLength(3);
    expect(positioned.edges).toHaveLength(2);

    const nodeIds = positioned.nodes.map((n) => n.id).sort();
    expect(nodeIds).toEqual(["a", "b", "c"]);

    for (const node of positioned.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    }
  });

  test("routes self-loops", async () => {
    const selfLoop = doc({
      nodes: [{ id: "n", kind: "node" }],
      edges: [{ id: "loop", kind: "self", sourceId: "n", targetId: "n" }],
    });
    const [edge] = (await wasmLayout().layout(selfLoop)).edges;
    expect(edge?.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  test("is deterministic across repeated layout runs", async () => {
    const engine = wasmLayout();
    const first = await engine.layout(graphDoc);
    const second = await engine.layout(graphDoc);
    expect(first).toEqual(second);
  });

  test("is deterministic with direction option", async () => {
    const engine = wasmLayout();
    const first = await engine.layout(graphDoc, { direction: "LR" });
    const second = await engine.layout(graphDoc, { direction: "LR" });
    expect(first).toEqual(second);
  });

  test("edges have waypoints", async () => {
    const positioned = await wasmLayout().layout(graphDoc);
    for (const edge of positioned.edges) {
      expect(edge.waypoints.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("computes diagram dimensions", async () => {
    const positioned = await wasmLayout().layout(graphDoc);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("left-right direction produces wider-than-tall layout", async () => {
    const tb = await wasmLayout().layout(graphDoc, { direction: "TB" });
    const lr = await wasmLayout().layout(graphDoc, { direction: "LR" });
    expect(lr.width).toBeGreaterThan(tb.width);
    expect(lr.height).toBeLessThan(tb.height);
  });

  test("bottom-top direction reverses vertical order", async () => {
    const tb = await wasmLayout().layout(graphDoc, { direction: "TB" });
    const bt = await wasmLayout().layout(graphDoc, { direction: "BT" });
    expect(bt.width).toBeGreaterThan(0);
    expect(bt.height).toBeGreaterThan(0);
    for (const node of bt.nodes) {
      expect(node.y).toBeGreaterThanOrEqual(0);
    }
    const tbSorted = [...tb.nodes].sort((a, b) => a.y - b.y);
    const btSorted = [...bt.nodes].sort((a, b) => b.y - a.y);
    expect(tbSorted.map((n) => n.id)).toEqual(btSorted.map((n) => n.id));
  });

  test("right-left direction reverses horizontal order", async () => {
    const lr = await wasmLayout().layout(graphDoc, { direction: "LR" });
    const rl = await wasmLayout().layout(graphDoc, { direction: "RL" });
    expect(rl.width).toBeGreaterThan(0);
    expect(rl.height).toBeGreaterThan(0);
    const lrSorted = [...lr.nodes].sort((a, b) => a.x - b.x);
    const rlSorted = [...rl.nodes].sort((a, b) => b.x - a.x);
    expect(lrSorted.map((n) => n.id)).toEqual(rlSorted.map((n) => n.id));
  });

  test("respects custom node size", async () => {
    const positioned = await wasmLayout().layout(graphDoc, {
      nodeSize: { width: 200, height: 100 },
    });
    for (const node of positioned.nodes) {
      expect(node.width).toBe(200);
      expect(node.height).toBe(100);
    }
  });

  test("respects custom spacing", async () => {
    const tight = await wasmLayout().layout(graphDoc, {
      spacing: { node: 20, rank: 40 },
    });
    const loose = await wasmLayout().layout(graphDoc, {
      spacing: { node: 200, rank: 400 },
    });
    expect(loose.height).toBeGreaterThan(tight.height);
  });

  test("handles disconnected nodes", async () => {
    const disconnected = doc({
      nodes: [
        { id: "x", kind: "node" },
        { id: "y", kind: "node" },
        { id: "z", kind: "node" },
      ],
      edges: [],
    });
    const positioned = await wasmLayout().layout(disconnected);
    expect(positioned.nodes).toHaveLength(3);
    for (const node of positioned.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
    }
  });

  test("handles cyclic graph", async () => {
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
      ],
    });
    const positioned = await wasmLayout().layout(cyclic);
    expect(positioned.nodes).toHaveLength(3);
    expect(positioned.edges).toHaveLength(3);
    expect(positioned.width).toBeGreaterThan(0);
  });

  test("returns correct PositionedDiagram shape", async () => {
    const positioned = await wasmLayout().layout(graphDoc);
    expect(positioned).toHaveProperty("document");
    expect(positioned).toHaveProperty("nodes");
    expect(positioned).toHaveProperty("edges");
    expect(positioned).toHaveProperty("groups");
    expect(positioned).toHaveProperty("activations");
    expect(positioned).toHaveProperty("width");
    expect(positioned).toHaveProperty("height");
    expect(positioned.groups).toEqual([]);
    expect(positioned.activations).toEqual([]);
  });

  test("edge waypoints are numbers", async () => {
    const positioned = await wasmLayout().layout(graphDoc);
    for (const edge of positioned.edges) {
      for (const wp of edge.waypoints) {
        expect(typeof wp.x).toBe("number");
        expect(typeof wp.y).toBe("number");
        expect(Number.isFinite(wp.x)).toBe(true);
        expect(Number.isFinite(wp.y)).toBe(true);
      }
    }
  });
});

describe("custom WASM bridge", () => {
  test("uses injected bridge", async () => {
    const customBridge: WasmBridge = {
      name: "test-bridge",
      compute: async (input: WasmGraphInput): Promise<WasmLayoutResult> => {
        const nodes = input.nodes.map((n, i) => ({
          id: n.id,
          x: i * (input.nodeSize.width + input.spacing.node),
          y: 0,
          width: input.nodeSize.width,
          height: input.nodeSize.height,
        }));
        return {
          nodes,
          edges: input.edges.map((e) => ({ id: e.id, waypoints: [] })),
          width: nodes.length * input.nodeSize.width,
          height: input.nodeSize.height,
        };
      },
    };

    const engine = wasmLayout(customBridge);
    expect(engine.name).toBe("wasm:test-bridge");

    const positioned = await engine.layout(graphDoc);
    expect(positioned.nodes).toHaveLength(3);
    expect(positioned.width).toBeGreaterThan(0);
  });

  test("custom bridge is deterministic", async () => {
    let callCount = 0;
    const countingBridge: WasmBridge = {
      name: "counter",
      compute: async (input: WasmGraphInput): Promise<WasmLayoutResult> => {
        callCount++;
        const nodes = input.nodes.map((n, i) => ({
          id: n.id,
          x: i * 100,
          y: 0,
          width: input.nodeSize.width,
          height: input.nodeSize.height,
        }));
        return {
          nodes,
          edges: input.edges.map((e) => ({ id: e.id, waypoints: [] })),
          width: nodes.length * 100,
          height: 100,
        };
      },
    };

    const engine = wasmLayout(countingBridge);
    const first = await engine.layout(graphDoc);
    const second = await engine.layout(graphDoc);
    expect(first).toEqual(second);
    expect(callCount).toBe(1);
  });
});

describe("TypeScriptFallbackBridge", () => {
  test("has correct name", () => {
    const bridge = new TypeScriptFallbackBridge();
    expect(bridge.name).toBe("ts-fallback");
  });

  test("handles empty input", async () => {
    const bridge = new TypeScriptFallbackBridge();
    const result = await bridge.compute({
      nodes: [],
      edges: [],
      direction: "TB",
      nodeSize: { width: 120, height: 56 },
      spacing: { node: 80, rank: 120 },
      padding: 40,
    });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
