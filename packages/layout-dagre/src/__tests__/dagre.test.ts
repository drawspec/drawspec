import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/layout";
import { computeSelfLoopWaypoints, simpleGraphLayout } from "@drawspec/layout";
import { dagreLayout } from "../index";

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

describe("dagre layout", () => {
  test("supports non-sequence documents", () => {
    const engine = dagreLayout();
    expect(engine.supports(graphDoc)).toBe(true);
    expect(engine.supports(sequenceDoc)).toBe(false);
  });

  test("engine name is dagre", () => {
    expect(dagreLayout().name).toBe("dagre");
  });

  test("handles an empty diagram", async () => {
    const positioned = await dagreLayout().layout(doc());
    expect(positioned.nodes).toEqual([]);
    expect(positioned.edges).toEqual([]);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("handles a single node", async () => {
    const positioned = await dagreLayout().layout(doc({ nodes: [{ id: "only", kind: "node" }] }));
    expect(positioned.nodes).toHaveLength(1);
    expect(positioned.nodes[0]?.id).toBe("only");
    expect(positioned.nodes[0]?.width).toBeGreaterThan(0);
    expect(positioned.nodes[0]?.height).toBeGreaterThan(0);
  });

  test("positions nodes with edges", async () => {
    const positioned = await dagreLayout().layout(graphDoc);
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

  test("routes self-loops deterministically", async () => {
    const selfLoop = doc({
      nodes: [{ id: "n", kind: "node" }],
      edges: [{ id: "loop", kind: "self", sourceId: "n", targetId: "n" }],
    });
    const [edge] = (await dagreLayout().layout(selfLoop)).edges;
    expect(edge?.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  test("is deterministic across repeated layout runs", async () => {
    const engine = dagreLayout();
    const first = await engine.layout(graphDoc);
    const second = await engine.layout(graphDoc);
    expect(first).toEqual(second);
  });

  test("is deterministic with direction option", async () => {
    const engine = dagreLayout();
    const first = await engine.layout(graphDoc, { direction: "LR" });
    const second = await engine.layout(graphDoc, { direction: "LR" });
    expect(first).toEqual(second);
  });

  test("edges have waypoints", async () => {
    const positioned = await dagreLayout().layout(graphDoc);
    for (const edge of positioned.edges) {
      expect(edge.waypoints.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("computes diagram dimensions", async () => {
    const positioned = await dagreLayout().layout(graphDoc);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("left-right direction produces wider-than-tall layout", async () => {
    const tb = await dagreLayout().layout(graphDoc, { direction: "TB" });
    const lr = await dagreLayout().layout(graphDoc, { direction: "LR" });
    expect(lr.width).toBeGreaterThan(tb.width);
    expect(lr.height).toBeLessThan(tb.height);
  });
});

describe("dagre sizing integration", () => {
  test("nodes with long labels are wider than default 120px in auto mode", async () => {
    const longLabel = doc({
      id: "long-label",
      nodes: [
        { id: "short", kind: "component", label: "A" },
        {
          id: "long",
          kind: "component",
          label: "This is a very long label that should exceed the default width of 120 pixels",
        },
      ],
      edges: [],
    });
    const positioned = await dagreLayout().layout(longLabel, { sizing: { mode: "auto" } });
    const shortNode = positioned.nodes.find((n) => n.id === "short")!;
    const longNode = positioned.nodes.find((n) => n.id === "long")!;
    expect(longNode.width).toBeGreaterThan(shortNode.width);
    expect(longNode.width).toBeGreaterThan(120);
  });

  test("nodes have labelLines from sizing", async () => {
    const labeled = doc({
      id: "labels",
      nodes: [
        { id: "n1", kind: "component", label: "Hello World" },
        { id: "n2", kind: "component", label: "Line 1\nLine 2" },
      ],
      edges: [],
    });
    const positioned = await dagreLayout().layout(labeled);
    const n1 = positioned.nodes.find((n) => n.id === "n1")!;
    const n2 = positioned.nodes.find((n) => n.id === "n2")!;
    expect(n1.labelLines).toBeDefined();
    expect(n1.labelLines.length).toBeGreaterThanOrEqual(1);
    expect(n2.labelLines).toBeDefined();
    expect(n2.labelLines.length).toBeGreaterThanOrEqual(2);
  });

  test("nodes have contentLayout from sizing", async () => {
    const labeled = doc({
      id: "content-layout",
      nodes: [{ id: "n", kind: "component", label: "Node" }],
      edges: [],
    });
    const positioned = await dagreLayout().layout(labeled);
    const node = positioned.nodes[0]!;
    expect(node.contentLayout).toBeDefined();
    expect(node.contentLayout.label).toBeDefined();
  });

  test("self-loop waypoints use computeSelfLoopWaypoints", async () => {
    const selfLoop = doc({
      nodes: [{ id: "n", kind: "component", label: "Node" }],
      edges: [{ id: "loop", kind: "self", sourceId: "n", targetId: "n" }],
    });
    const positioned = await dagreLayout().layout(selfLoop);
    const edge = positioned.edges[0]!;
    const node = positioned.nodes[0]!;
    const expected = computeSelfLoopWaypoints(node);
    expect(edge.waypoints).toEqual(expected);
  });

  test("canvasBounds uses computeCanvasBounds format", async () => {
    const positioned = await dagreLayout().layout(graphDoc);
    expect(positioned.canvasBounds).toBeDefined();
    expect(positioned.canvasBounds.x).toBeDefined();
    expect(positioned.canvasBounds.y).toBeDefined();
    expect(positioned.canvasBounds.width).toBeGreaterThan(0);
    expect(positioned.canvasBounds.height).toBeGreaterThan(0);
  });

  test("edges have labelLines field", async () => {
    const withLabels = doc({
      id: "edge-labels",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "uses",
        },
        {
          id: "e2",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "Line 1\nLine 2",
        },
      ],
    });
    const positioned = await dagreLayout().layout(withLabels);
    const e1 = positioned.edges.find((e) => e.id === "e1")!;
    const e2 = positioned.edges.find((e) => e.id === "e2")!;
    expect(e1.labelLines).toEqual(["uses"]);
    expect(e2.labelLines).toEqual(["Line 1", "Line 2"]);
  });

  test("edges have labelPosition field", async () => {
    const withLabel = doc({
      id: "edge-label-pos",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "uses",
        },
      ],
    });
    const positioned = await dagreLayout().layout(withLabel);
    const e1 = positioned.edges[0]!;
    expect(e1.labelPosition).toBeDefined();
    expect(typeof e1.labelPosition.x).toBe("number");
    expect(typeof e1.labelPosition.y).toBe("number");
  });

  test("dagre sizing matches built-in graph engine for same input", async () => {
    const document = doc({
      id: "compare",
      nodes: [
        { id: "alpha", kind: "component", label: "Alpha" },
        { id: "beta", kind: "component", label: "Beta Beta Beta" },
      ],
      edges: [{ id: "e", kind: "depends-on", sourceId: "alpha", targetId: "beta" }],
    }) as DiagramDocument;
    const opts = { sizing: { mode: "auto" as const } };
    const dagreResult = await dagreLayout().layout(document, opts);
    const builtInResult = await simpleGraphLayout().layout(document, opts);

    const dagreAlpha = dagreResult.nodes.find((n) => n.id === "alpha")!;
    const builtInAlpha = builtInResult.nodes.find((n) => n.id === "alpha")!;
    const dagreBeta = dagreResult.nodes.find((n) => n.id === "beta")!;
    const builtInBeta = builtInResult.nodes.find((n) => n.id === "beta")!;

    expect(dagreAlpha.labelLines).toEqual(builtInAlpha.labelLines);
    expect(dagreBeta.labelLines).toEqual(builtInBeta.labelLines);
    expect(dagreAlpha.width).toEqual(builtInAlpha.width);
    expect(dagreAlpha.height).toEqual(builtInAlpha.height);
    expect(dagreBeta.width).toEqual(builtInBeta.width);
    expect(dagreBeta.height).toEqual(builtInBeta.height);
  });
});
