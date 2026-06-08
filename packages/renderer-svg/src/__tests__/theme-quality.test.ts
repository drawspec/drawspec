import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import type { PositionedDiagram } from "@drawspec/layout";
import { renderSvgSync } from "../index";

function document(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    annotations: [],
    edges: [],
    groups: [],
    id: "theme-quality",
    kind: "graph",
    nodes: [],
    schemaVersion: "1.0.0",
    ...overrides,
  } as DiagramDocument;
}

function positionedDiagram(
  doc: DiagramDocument,
  overrides: Partial<PositionedDiagram> = {}
): PositionedDiagram {
  return {
    activations: [],
    canvasBounds: { x: 0, y: 0, width: 200, height: 200 },
    document: doc,
    edges: [],
    groups: [],
    height: 200,
    nodes: [
      {
        id: "n",
        kind: "component",
        label: "Node",
        x: 10,
        y: 10,
        width: 80,
        height: 40,
        contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["Node"] } },
        labelLines: ["Node"],
      },
    ],
    width: 200,
    ...overrides,
  };
}

const baseDoc = document({
  id: "theme-base",
  nodes: [{ id: "n", kind: "component", label: "Node" }],
});

describe("Theme rendering", () => {
  test("light theme uses white background by default", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, { positionedDiagram: diagram });
    expect(svg).toContain('fill="#ffffff"');
  });

  test("dark theme applies dark background", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { background: "#1a1a2e" },
    });
    expect(svg).toContain('fill="#1a1a2e"');
  });

  test("high-contrast theme uses black background", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { background: "#000000", text: "#ffffff", nodeStroke: "#ffffff" },
    });
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('fill="#ffffff"');
  });

  test("high-contrast theme uses white text on text elements", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { text: "#ffffff" },
    });
    // The text fill should be white
    const textMatch = svg.match(/<text[^>]*fill="#ffffff"/s);
    expect(textMatch).not.toBeNull();
  });

  test("custom node fill overrides default", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { nodeFill: "#fef3c7" },
    });
    expect(svg).toContain('fill="#fef3c7"');
  });

  test("custom edge stroke color is used in edge rendering", () => {
    const doc = document({
      id: "edge-theme",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [{ id: "e", kind: "calls", sourceId: "a", targetId: "b" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        {
          id: "a",
          kind: "component",
          label: "A",
          x: 0,
          y: 0,
          width: 60,
          height: 40,
          contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["A"] } },
          labelLines: ["A"],
        },
        {
          id: "b",
          kind: "component",
          label: "B",
          x: 100,
          y: 0,
          width: 60,
          height: 40,
          contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["B"] } },
          labelLines: ["B"],
        },
      ],
      edges: [
        {
          id: "e",
          kind: "calls",
          sourceId: "a",
          targetId: "b",
          waypoints: [
            { x: 60, y: 20 },
            { x: 100, y: 20 },
          ],
          labelPosition: { x: 80, y: 20 },
          labelLines: [],
        },
      ],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: diagram,
      theme: { edgeStroke: "#dc2626" },
    });
    expect(svg).toContain('stroke="#dc2626"');
  });

  test("group fill and stroke come from theme", () => {
    const doc = document({
      id: "group-theme",
      nodes: [],
      edges: [],
      groups: [{ id: "g", kind: "boundary", label: "Group" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [],
      groups: [
        {
          id: "g",
          kind: "boundary",
          label: "Group",
          childIds: [],
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          labelLines: ["Group"],
        },
      ],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: diagram,
      theme: { groupFill: "#f0f0f0", groupStroke: "#999999" },
    });
    expect(svg).toContain('fill="#f0f0f0"');
    expect(svg).toContain('stroke="#999999"');
  });

  test("partial theme override merges with defaults", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { background: "#f5f5f5" },
    });
    expect(svg).toContain('fill="#f5f5f5"');
    // Default node stroke should still be present
    expect(svg).toContain('stroke="#334155"');
  });

  test("theme determinism: same theme produces identical SVG", () => {
    const diagram = positionedDiagram(baseDoc);
    const first = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { background: "#111827" },
    });
    const second = renderSvgSync(baseDoc, {
      positionedDiagram: { ...diagram, nodes: [...diagram.nodes] },
      theme: { background: "#111827" },
    });
    expect(second).toBe(first);
  });

  test("marker definitions use theme edge stroke color", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { edgeStroke: "#16a34a" },
    });
    expect(svg).toContain('fill="#16a34a"');
    expect(svg).toMatch(/marker-filled-triangle.*fill="#16a34a"/s);
  });

  test("activation bars use theme activation colors", () => {
    const doc = document({
      id: "activation-theme",
      nodes: [{ id: "n", kind: "participant", label: "P" }],
      edges: [{ id: "e", kind: "message", sourceId: "n", targetId: "n" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        {
          id: "n",
          kind: "participant",
          label: "P",
          x: 0,
          y: 0,
          width: 40,
          height: 200,
          contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["P"] } },
          labelLines: ["P"],
        },
      ],
      edges: [
        {
          id: "e",
          kind: "message",
          sourceId: "n",
          targetId: "n",
          waypoints: [
            { x: 20, y: 50 },
            { x: 20, y: 100 },
          ],
          labelPosition: { x: 20, y: 75 },
          labelLines: [],
        },
      ],
      activations: [{ id: "bar", nodeId: "n", edgeId: "e", x: 10, y: 50, width: 20, height: 50 }],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: diagram,
      theme: { activationFill: "#dcfce7", activationStroke: "#15803d" },
    });
    expect(svg).toContain('fill="#dcfce7"');
    expect(svg).toContain('stroke="#15803d"');
  });

  test("node stroke from theme is applied", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { nodeStroke: "#7c3aed" },
    });
    expect(svg).toContain('stroke="#7c3aed"');
  });

  test("font-family from theme appears in text elements", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, {
      positionedDiagram: diagram,
      theme: { fontFamily: "Helvetica, sans-serif" },
    });
    expect(svg).toContain('font-family="Helvetica, sans-serif"');
  });

  test("CSS variable style block is present in SVG output", () => {
    const diagram = positionedDiagram(baseDoc);
    const svg = renderSvgSync(baseDoc, { positionedDiagram: diagram });
    expect(svg).toContain("<style>");
    expect(svg).toContain("--ds-background");
    expect(svg).toContain("--ds-text");
    expect(svg).toContain("--ds-node-fill");
  });
});
