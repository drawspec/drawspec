import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { renderSvgSync, resolveStyle } from "../index";

function document(edgeKind: string, overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    annotations: [],
    edges: [{ id: "ab", kind: edgeKind, sourceId: "a", targetId: "b" }],
    groups: [],
    id: "edge-kind-test",
    kind: "graph",
    nodes: [
      { id: "a", kind: "component", label: "A" },
      { id: "b", kind: "component", label: "B" },
    ],
    schemaVersion: "1.0.0",
    ...overrides,
  } as DiagramDocument;
}

function positionedDiagram(doc: DiagramDocument) {
  const edge = doc.edges[0];
  if (edge === undefined) {
    throw new Error("test document must contain an edge");
  }
  return {
    activations: [],
    canvasBounds: { x: 0, y: 0, width: 200, height: 80 },
    document: doc,
    edges: [
      {
        ...edge,
        waypoints: [
          { x: 30, y: 30 },
          { x: 170, y: 30 },
        ],
        labelPosition: { x: 100, y: 30 },
        labelLines: [],
      },
    ],
    groups: [],
    height: 80,
    nodes: [
      {
        id: "a",
        kind: "component",
        label: "A",
        x: 0,
        y: 10,
        width: 60,
        height: 40,
        contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["A"] } },
        labelLines: ["A"],
      },
      {
        id: "b",
        kind: "component",
        label: "B",
        x: 140,
        y: 10,
        width: 60,
        height: 40,
        contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["B"] } },
        labelLines: ["B"],
      },
    ],
    width: 200,
  };
}

function resolveEdgeStyle(edgeKind: string, docOverrides?: Partial<DiagramDocument>) {
  const doc = document(edgeKind, docOverrides);
  const edge = doc.edges[0];
  if (edge === undefined) throw new Error("missing edge");
  return resolveStyle(doc, edge, undefined, "edge");
}

function renderEdge(edgeKind: string, docOverrides?: Partial<DiagramDocument>): string {
  const doc = document(edgeKind, docOverrides);
  return renderSvgSync(doc, { positionedDiagram: positionedDiagram(doc) });
}

describe("edge kind visual defaults", () => {
  const edgeKindExpectations: Array<{
    kind: string;
    lineStyle: string | undefined;
    strokeDasharray: string | undefined;
    arrowEnd: string;
  }> = [
    {
      kind: "message",
      lineStyle: "solid",
      strokeDasharray: undefined,
      arrowEnd: "filled-triangle",
    },
    { kind: "response", lineStyle: "dashed", strokeDasharray: "8 4", arrowEnd: "open-arrow" },
    { kind: "extends", lineStyle: "solid", strokeDasharray: undefined, arrowEnd: "open-triangle" },
    { kind: "implements", lineStyle: "dashed", strokeDasharray: "8 4", arrowEnd: "open-triangle" },
    { kind: "uses", lineStyle: "dashed", strokeDasharray: "8 4", arrowEnd: "open-arrow" },
    {
      kind: "dynamic-message",
      lineStyle: "solid",
      strokeDasharray: undefined,
      arrowEnd: "filled-triangle",
    },
    {
      kind: "transition",
      lineStyle: "solid",
      strokeDasharray: undefined,
      arrowEnd: "filled-triangle",
    },
    { kind: "dependency", lineStyle: "dashed", strokeDasharray: "8 4", arrowEnd: "open-arrow" },
    { kind: "provides", lineStyle: "solid", strokeDasharray: undefined, arrowEnd: "none" },
    { kind: "requires", lineStyle: "solid", strokeDasharray: undefined, arrowEnd: "none" },
    {
      kind: "communication",
      lineStyle: "solid",
      strokeDasharray: undefined,
      arrowEnd: "open-arrow",
    },
    { kind: "flow", lineStyle: "solid", strokeDasharray: undefined, arrowEnd: "filled-triangle" },
  ];

  for (const { kind, lineStyle, strokeDasharray, arrowEnd } of edgeKindExpectations) {
    describe(`edge kind "${kind}"`, () => {
      test(`resolves lineStyle to ${lineStyle}`, () => {
        const style = resolveEdgeStyle(kind);
        expect(style.lineStyle).toBe(lineStyle);
      });

      test(`resolves arrowEnd to ${arrowEnd}`, () => {
        const style = resolveEdgeStyle(kind);
        expect(style.arrowEnd).toBe(arrowEnd);
      });

      test(`produces correct strokeDasharray in SVG`, () => {
        const svg = renderEdge(kind);
        if (strokeDasharray === undefined) {
          expect(svg).not.toContain("stroke-dasharray");
        } else {
          expect(svg).toContain(`stroke-dasharray="${strokeDasharray}"`);
        }
      });
    });
  }

  test("unknown edge kinds fall back to default filled-triangle without dasharray", () => {
    const style = resolveEdgeStyle("unknown-kind");
    expect(style.arrowEnd).toBe("filled-triangle");
    expect(style.lineStyle).toBeUndefined();
    expect(style.strokeDasharray).toBeUndefined();
  });

  test("explicit document style rules override edge kind defaults", () => {
    const doc = document("response", {
      styles: { rules: { "relationship:response": { lineStyle: "dotted", arrowEnd: "diamond" } } },
    });
    const edge = doc.edges[0];
    if (edge === undefined) throw new Error("missing edge");
    const style = resolveStyle(doc, edge, undefined, "edge");
    expect(style.lineStyle).toBe("dotted");
    expect(style.arrowEnd).toBe("diamond");
    expect(style.strokeDasharray).toBe("2 4");
  });

  test("tag-based style rules override edge kind defaults", () => {
    const doc = document("message", {
      edges: [{ id: "ab", kind: "message", sourceId: "a", targetId: "b", tags: ["async"] }],
      styles: { rules: { "tag:async": { lineStyle: "dashed", arrowEnd: "open-arrow" } } },
    });
    const edge = doc.edges[0];
    if (edge === undefined) throw new Error("missing edge");
    const style = resolveStyle(doc, edge, undefined, "edge");
    expect(style.lineStyle).toBe("dashed");
    expect(style.arrowEnd).toBe("open-arrow");
  });

  test("explicit entity style overrides edge kind defaults", () => {
    const doc = document("extends", {
      edges: [
        {
          id: "ab",
          kind: "extends",
          sourceId: "a",
          targetId: "b",
          style: { id: "custom" },
        },
      ],
      styles: { rules: { custom: { lineStyle: "dotted", arrowEnd: "circle" } } },
    });
    const edge = doc.edges[0];
    if (edge === undefined) throw new Error("missing edge");
    const style = resolveStyle(doc, edge, undefined, "edge");
    expect(style.lineStyle).toBe("dotted");
    expect(style.arrowEnd).toBe("circle");
  });

  test("node kinds are not affected by edge kind style map", () => {
    const doc: DiagramDocument = {
      annotations: [],
      edges: [{ id: "ab", kind: "response", sourceId: "a", targetId: "b" }],
      groups: [],
      id: "node-kind-test",
      kind: "graph",
      nodes: [{ id: "a", kind: "actor", label: "Actor" }],
      schemaVersion: "1.0.0",
    } as DiagramDocument;
    const node = doc.nodes[0];
    if (node === undefined) throw new Error("missing node");
    const style = resolveStyle(doc, node, undefined, "node");
    expect(style.fill).toBe("#eef2ff");
    expect(style.stroke).toBe("#4338ca");
    expect(style.lineStyle).toBeUndefined();
  });

  test("provides and requires edges omit marker-end in SVG output", () => {
    const svgProvides = renderEdge("provides");
    expect(svgProvides).not.toContain("marker-end=");
    const svgRequires = renderEdge("requires");
    expect(svgRequires).not.toContain("marker-end=");
  });

  test("architecture uses edge gets filled-triangle for C4 style", () => {
    const doc: DiagramDocument = {
      annotations: [],
      edges: [{ id: "ab", kind: "uses", sourceId: "a", targetId: "b" }],
      groups: [],
      id: "arch-uses-test",
      kind: "architecture",
      nodes: [
        { id: "a", kind: "container", label: "A" },
        { id: "b", kind: "container", label: "B" },
      ],
      schemaVersion: "1.0.0",
    } as DiagramDocument;
    const edge = doc.edges[0];
    if (edge === undefined) throw new Error("missing edge");
    const style = resolveStyle(doc, edge, undefined, "edge");
    expect(style.arrowEnd).toBe("open-arrow");
    expect(style.lineStyle).toBe("dashed");
  });
});
