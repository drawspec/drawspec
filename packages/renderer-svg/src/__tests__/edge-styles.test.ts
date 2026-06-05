import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { renderSvgSync, resolveStyle } from "../index";

function makeDoc(styles?: DiagramDocument["styles"]): DiagramDocument {
  return {
    annotations: [],
    edges: [
      {
        id: "ab",
        kind: "calls",
        sourceId: "a",
        targetId: "b",
        ...(styles ? { style: { id: "edge-style" } } : {}),
      },
    ],
    groups: [],
    id: "edge-style-test",
    kind: "graph",
    nodes: [
      { id: "a", kind: "component", label: "A" },
      { id: "b", kind: "component", label: "B" },
    ],
    schemaVersion: "1.0.0",
    styles,
  } as DiagramDocument;
}

function positionedDiagram(doc: DiagramDocument) {
  const edge = doc.edges[0];
  if (!edge) throw new Error("missing edge");
  return {
    activations: [],
    document: doc,
    edges: [
      {
        ...edge,
        waypoints: [
          { x: 30, y: 30 },
          { x: 170, y: 30 },
        ],
      },
    ],
    groups: [],
    height: 80,
    nodes: [
      { id: "a", kind: "component", label: "A", x: 0, y: 10, width: 60, height: 40 },
      { id: "b", kind: "component", label: "B", x: 140, y: 10, width: 60, height: 40 },
    ],
    width: 200,
  };
}

function renderWithRule(rule: Record<string, unknown>): string {
  const doc = makeDoc({ rules: { "edge-style": rule } });
  return renderSvgSync(doc, { positionedDiagram: positionedDiagram(doc) });
}

function resolveEdgeStyle(rule: Record<string, unknown>) {
  const doc = makeDoc({ rules: { "edge-style": rule } });
  const edge = doc.edges[0];
  if (!edge) throw new Error("missing edge");
  return resolveStyle(doc, edge, undefined, "edge");
}

describe("line style presets", () => {
  describe("solid", () => {
    test("produces no stroke-dasharray attribute", () => {
      const svg = renderWithRule({ lineStyle: "solid" });
      expect(svg).not.toContain("stroke-dasharray");
    });

    test("resolves style without strokeDasharray", () => {
      const style = resolveEdgeStyle({ lineStyle: "solid" });
      expect(style.lineStyle).toBe("solid");
      expect(style.strokeDasharray).toBeUndefined();
    });
  });

  describe("dashed", () => {
    test('produces stroke-dasharray="8 4"', () => {
      const svg = renderWithRule({ lineStyle: "dashed" });
      expect(svg).toContain('stroke-dasharray="8 4"');
    });

    test("resolves style with correct dasharray", () => {
      const style = resolveEdgeStyle({ lineStyle: "dashed" });
      expect(style.lineStyle).toBe("dashed");
      expect(style.strokeDasharray).toBe("8 4");
    });
  });

  describe("dotted", () => {
    test('produces stroke-dasharray="2 4"', () => {
      const svg = renderWithRule({ lineStyle: "dotted" });
      expect(svg).toContain('stroke-dasharray="2 4"');
    });

    test("resolves style with correct dasharray", () => {
      const style = resolveEdgeStyle({ lineStyle: "dotted" });
      expect(style.lineStyle).toBe("dotted");
      expect(style.strokeDasharray).toBe("2 4");
    });
  });

  describe("dash-dot", () => {
    test('produces stroke-dasharray="8 4 2 4"', () => {
      const svg = renderWithRule({ lineStyle: "dash-dot" });
      expect(svg).toContain('stroke-dasharray="8 4 2 4"');
    });

    test("resolves style with correct dasharray", () => {
      const style = resolveEdgeStyle({ lineStyle: "dash-dot" });
      expect(style.lineStyle).toBe("dash-dot");
      expect(style.strokeDasharray).toBe("8 4 2 4");
    });
  });

  describe("explicit strokeDasharray override", () => {
    test("explicit strokeDasharray overrides lineStyle preset", () => {
      const svg = renderWithRule({ lineStyle: "dashed", strokeDasharray: "1 2 3" });
      expect(svg).toContain('stroke-dasharray="1 2 3"');
      expect(svg).not.toContain('stroke-dasharray="8 4"');
    });

    test("empty strokeDasharray string removes dasharray", () => {
      const style = resolveEdgeStyle({ lineStyle: "dashed", strokeDasharray: "" });
      expect(style.strokeDasharray).toBeUndefined();
    });
  });

  describe("edge-kind default line styles", () => {
    const edgeKinds: Array<{ kind: string; expectedDasharray: string | undefined }> = [
      { kind: "message", expectedDasharray: undefined },
      { kind: "response", expectedDasharray: "8 4" },
      { kind: "implements", expectedDasharray: "8 4" },
      { kind: "uses", expectedDasharray: "8 4" },
      { kind: "dependency", expectedDasharray: "8 4" },
      { kind: "transition", expectedDasharray: undefined },
      { kind: "flow", expectedDasharray: undefined },
      { kind: "provides", expectedDasharray: undefined },
      { kind: "requires", expectedDasharray: undefined },
      { kind: "communication", expectedDasharray: undefined },
    ];

    for (const { kind, expectedDasharray } of edgeKinds) {
      test(`${kind} edge has correct stroke-dasharray in SVG`, () => {
        const doc: DiagramDocument = {
          annotations: [],
          edges: [{ id: "ab", kind, sourceId: "a", targetId: "b" }],
          groups: [],
          id: "edge-kind-dash-test",
          kind: "graph",
          nodes: [
            { id: "a", kind: "component", label: "A" },
            { id: "b", kind: "component", label: "B" },
          ],
          schemaVersion: "1.0.0",
        } as DiagramDocument;
        const svg = renderSvgSync(doc, { positionedDiagram: positionedDiagram(doc) });
        if (expectedDasharray === undefined) {
          expect(svg).not.toContain("stroke-dasharray");
        } else {
          expect(svg).toContain(`stroke-dasharray="${expectedDasharray}"`);
        }
      });
    }
  });

  describe("default when no line style is configured", () => {
    test("edge renders solid with no dasharray", () => {
      const svg = renderWithRule({});
      expect(svg).not.toContain("stroke-dasharray");
    });
  });

  describe("groups always have dashed border", () => {
    test("group rect has stroke-dasharray", () => {
      const doc: DiagramDocument = {
        annotations: [],
        edges: [],
        groups: [{ id: "g1", kind: "boundary", label: "Group", childIds: [] }],
        id: "group-dash-test",
        kind: "graph",
        nodes: [],
        schemaVersion: "1.0.0",
      } as DiagramDocument;
      const svg = renderSvgSync(doc, {
        positionedDiagram: {
          activations: [],
          document: doc,
          edges: [],
          groups: [
            {
              id: "g1",
              kind: "boundary",
              label: "Group",
              childIds: [],
              x: 0,
              y: 0,
              width: 200,
              height: 100,
            },
          ],
          height: 200,
          nodes: [],
          width: 300,
        },
      });
      expect(svg).toContain('stroke-dasharray="6 4"');
    });
  });
});
