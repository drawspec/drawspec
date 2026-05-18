import { describe, expect, test } from "bun:test";
import { LayoutCache, sequenceLayout, simpleGraphLayout } from "../index";

function doc(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id: "doc",
    kind: "graph",
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    ...overrides,
  };
}

const graphDoc = doc({
  nodes: [
    { id: "b", kind: "component", label: "B" },
    { id: "a", kind: "component", label: "A" },
    { id: "c", kind: "component", label: "C" },
  ],
  edges: [
    { id: "e2", kind: "depends-on", sourceId: "b", targetId: "c" },
    { id: "e1", kind: "depends-on", sourceId: "a", targetId: "b" },
  ],
});

const sequenceDoc = doc({
  id: "seq",
  kind: "sequence",
  nodes: [
    { id: "user", kind: "actor", label: "User" },
    { id: "api", kind: "participant", label: "API" },
    { id: "bank", kind: "participant", label: "Bank" },
  ],
  edges: [
    { id: "m1", kind: "message", sourceId: "user", targetId: "api", label: "Request" },
    { id: "m2", kind: "message", sourceId: "api", targetId: "bank", label: "Authorize" },
    { id: "m3", kind: "message", sourceId: "bank", targetId: "api", label: "Approved" },
  ],
  groups: [
    {
      id: "alt1",
      kind: "alt",
      childIds: ["m2", "m3"],
      metadata: {
        operands: [
          { condition: "Approved", childIds: ["m3"] },
          { condition: "Declined", childIds: [] },
        ],
      },
    },
  ],
});

describe("sequence layout", () => {
  test("supports only sequence documents", () => {
    const engine = sequenceLayout();
    expect(engine.supports(sequenceDoc)).toBe(true);
    expect(engine.supports(graphDoc)).toBe(false);
  });

  test("positions lifelines at equal horizontal intervals", async () => {
    const positioned = await sequenceLayout().layout(sequenceDoc);
    expect(positioned.nodes.map((node) => [node.id, node.x, node.y])).toEqual([
      ["user", 40, 40],
      ["api", 200, 40],
      ["bank", 360, 40],
    ]);
  });

  test("positions messages at sequential vertical intervals", async () => {
    const positioned = await sequenceLayout().layout(sequenceDoc);
    expect(positioned.edges.map((edge) => edge.waypoints[0]?.y)).toEqual([152, 208, 264]);
  });

  test("creates fragment boxes and operand lanes", async () => {
    const [fragment] = (await sequenceLayout().layout(sequenceDoc)).groups;
    expect(fragment).toMatchObject({ id: "alt1", x: 176, y: 180, width: 328, height: 112 });
    expect(fragment?.lanes?.map((lane) => [lane.label, lane.childIds])).toEqual([
      ["Approved", ["m3"]],
      ["Declined", []],
    ]);
  });

  test("computes activation bars from message flow", async () => {
    const positioned = await sequenceLayout().layout(sequenceDoc);
    expect(
      positioned.activations.map((bar) => [bar.nodeId, bar.edgeId, bar.x, bar.y, bar.height])
    ).toEqual([
      ["api", "m1", 255, 156, 48],
      ["bank", "m2", 415, 212, 48],
      ["api", "m3", 255, 268, 48],
    ]);
  });

  test("is deterministic across repeated layout runs", async () => {
    const engine = sequenceLayout();
    expect(await engine.layout(sequenceDoc)).toEqual(await engine.layout(sequenceDoc));
  });
});

describe("simple graph layout", () => {
  test("supports non-sequence documents", () => {
    const engine = simpleGraphLayout();
    expect(engine.supports(graphDoc)).toBe(true);
    expect(engine.supports(sequenceDoc)).toBe(false);
  });

  test("sorts nodes by dependency depth for top-bottom layout", async () => {
    const positioned = await simpleGraphLayout().layout(graphDoc);
    expect(positioned.nodes.map((node) => [node.id, node.x, node.y])).toEqual([
      ["a", 40, 40],
      ["b", 40, 216],
      ["c", 40, 392],
    ]);
  });

  test("supports left-right layout", async () => {
    const positioned = await simpleGraphLayout().layout(graphDoc, { direction: "LR" });
    expect(positioned.nodes.map((node) => [node.id, node.x, node.y])).toEqual([
      ["a", 40, 40],
      ["b", 216, 40],
      ["c", 392, 40],
    ]);
  });

  test("routes self-loops deterministically", async () => {
    const selfLoop = doc({
      nodes: [{ id: "n", kind: "node" }],
      edges: [{ id: "loop", kind: "self", sourceId: "n", targetId: "n" }],
    });
    const [edge] = (await simpleGraphLayout().layout(selfLoop)).edges;
    expect(edge?.waypoints).toEqual([
      { x: 100, y: 68 },
      { x: 188, y: 68 },
      { x: 188, y: 12 },
      { x: 100, y: 12 },
      { x: 100, y: 68 },
    ]);
  });

  test("handles a single node", async () => {
    const positioned = await simpleGraphLayout().layout(
      doc({ nodes: [{ id: "only", kind: "node" }] })
    );
    expect(positioned.nodes).toMatchObject([{ id: "only", x: 40, y: 40, width: 120, height: 56 }]);
  });

  test("handles an empty diagram", async () => {
    const positioned = await simpleGraphLayout().layout(doc());
    expect(positioned).toMatchObject({ nodes: [], edges: [], width: 40, height: 40 });
  });

  test("is deterministic across repeated layout runs", async () => {
    const engine = simpleGraphLayout();
    expect(await engine.layout(graphDoc)).toEqual(await engine.layout(graphDoc));
  });
});

describe("layout cache", () => {
  test("hits on repeated calls with the same IR and options", async () => {
    const engine = simpleGraphLayout();
    const first = await engine.layout(graphDoc);
    const second = await engine.layout(graphDoc);
    expect(second).toBe(first);
  });

  test("uses deterministic content-addressed keys", () => {
    const cache = new LayoutCache();
    const first = cache.keyFor(graphDoc, { direction: "TB" });
    const second = cache.keyFor({ ...graphDoc, nodes: [...graphDoc.nodes] }, { direction: "TB" });
    expect(second).toBe(first);
  });
});
