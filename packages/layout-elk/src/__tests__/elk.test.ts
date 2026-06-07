import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/layout";
import { elkLayout } from "../index";

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

describe("elk layout", () => {
  test("supports non-sequence documents", () => {
    const engine = elkLayout();
    expect(engine.supports(graphDoc)).toBe(true);
    expect(engine.supports(sequenceDoc)).toBe(false);
  });

  test("engine name is elk", () => {
    expect(elkLayout().name).toBe("elk");
  });

  test("handles an empty diagram", async () => {
    const positioned = await elkLayout().layout(doc());
    expect(positioned.nodes).toEqual([]);
    expect(positioned.edges).toEqual([]);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("handles a single node", async () => {
    const positioned = await elkLayout().layout(doc({ nodes: [{ id: "only", kind: "node" }] }));
    expect(positioned.nodes).toHaveLength(1);
    expect(positioned.nodes[0]?.id).toBe("only");
    expect(positioned.nodes[0]?.width).toBeGreaterThan(0);
    expect(positioned.nodes[0]?.height).toBeGreaterThan(0);
  });

  test("positions nodes with edges", async () => {
    const positioned = await elkLayout().layout(graphDoc);
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
    const [edge] = (await elkLayout().layout(selfLoop)).edges;
    expect(edge?.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  test("is deterministic across repeated layout runs", async () => {
    const engine = elkLayout();
    const first = await engine.layout(graphDoc);
    const second = await engine.layout(graphDoc);
    expect(first).toEqual(second);
  });

  test("is deterministic with direction option", async () => {
    const engine = elkLayout();
    const first = await engine.layout(graphDoc, { direction: "LR" });
    const second = await engine.layout(graphDoc, { direction: "LR" });
    expect(first).toEqual(second);
  });

  test("edges have waypoints", async () => {
    const positioned = await elkLayout().layout(graphDoc);
    for (const edge of positioned.edges) {
      expect(edge.waypoints.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("positions edge labels from ELK output", async () => {
    const positioned = await elkLayout().layout(
      doc({
        nodes: [
          { id: "source", kind: "component", label: "Source" },
          { id: "target", kind: "component", label: "Target" },
        ],
        edges: [
          {
            id: "labeled-edge",
            kind: "depends-on",
            sourceId: "source",
            targetId: "target",
            label: "long descriptive edge label",
          },
        ],
      })
    );

    const edge = positioned.edges.find((candidate) => candidate.id === "labeled-edge");
    expect(edge?.labelPosition).toBeDefined();
    expect(Number.isFinite(edge?.labelPosition?.x)).toBe(true);
    expect(Number.isFinite(edge?.labelPosition?.y)).toBe(true);
  });

  test("computes diagram dimensions", async () => {
    const positioned = await elkLayout().layout(graphDoc);
    expect(positioned.width).toBeGreaterThan(0);
    expect(positioned.height).toBeGreaterThan(0);
  });

  test("left-right direction produces wider-than-tall layout", async () => {
    const tb = await elkLayout().layout(graphDoc, { direction: "TB" });
    const lr = await elkLayout().layout(graphDoc, { direction: "LR" });
    expect(lr.width).toBeGreaterThan(tb.width);
    expect(lr.height).toBeLessThan(tb.height);
  });
});
