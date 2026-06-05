import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import type { PositionedDiagram } from "@drawspec/layout";
import { renderSvgSync } from "../index";

function document(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    annotations: [],
    edges: [],
    groups: [],
    id: "text-quality",
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
    document: doc,
    edges: [],
    groups: [],
    height: 300,
    nodes: [],
    width: 400,
    ...overrides,
  };
}

describe("Text quality", () => {
  test("truncates long node labels with ellipsis", () => {
    const doc = document({
      id: "truncate",
      nodes: [{ id: "n", kind: "component", label: "ExtremelyLongLabelThatCannotFitInSmallBox" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        {
          id: "n",
          kind: "component",
          label: "ExtremelyLongLabelThatCannotFitInSmallBox",
          x: 0,
          y: 0,
          width: 60,
          height: 40,
        },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("…");
    expect(svg).not.toContain("ExtremelyLongLabelThatCannotFitInSmallBox");
  });

  test("renders short labels completely", () => {
    const doc = document({
      id: "short-label",
      nodes: [{ id: "n", kind: "component", label: "AB" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [{ id: "n", kind: "component", label: "AB", x: 10, y: 10, width: 100, height: 40 }],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("AB");
    expect(svg).not.toContain("…");
  });

  test("renders single character labels", () => {
    const doc = document({
      id: "single-char",
      nodes: [{ id: "n", kind: "component", label: "X" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [{ id: "n", kind: "component", label: "X", x: 10, y: 10, width: 80, height: 40 }],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain(">\n      X\n    <");
  });

  test("handles empty label by falling back to node id", () => {
    const doc = document({
      id: "empty-label",
      nodes: [{ id: "svc", kind: "component" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [{ id: "svc", kind: "component", x: 0, y: 0, width: 80, height: 40 }],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("svc");
  });

  test("renders edge labels at midpoint", () => {
    const doc = document({
      id: "edge-label",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [{ id: "e", kind: "calls", sourceId: "a", targetId: "b", label: "uses" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [],
      edges: [
        {
          id: "e",
          kind: "calls",
          sourceId: "a",
          targetId: "b",
          label: "uses",
          waypoints: [
            { x: 0, y: 50 },
            { x: 200, y: 50 },
          ],
        },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("uses");
    expect(svg).toContain('x="100"');
  });

  test("renders group labels", () => {
    const doc = document({
      id: "group-label",
      nodes: [],
      edges: [],
      groups: [{ id: "g", kind: "boundary", label: "System Boundary" }],
    });
    const diagram = positionedDiagram(doc, {
      groups: [
        {
          id: "g",
          kind: "boundary",
          label: "System Boundary",
          childIds: [],
          x: 0,
          y: 0,
          width: 200,
          height: 100,
        },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("System Boundary");
  });

  test("uses clipPath for labels wider than node", () => {
    const doc = document({
      id: "clip-text",
      nodes: [{ id: "n", kind: "component", label: "VeryLongText" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        { id: "n", kind: "component", label: "VeryLongText", x: 5, y: 5, width: 10, height: 30 },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("<clipPath ");
  });

  test("shifts overlapping text labels apart", () => {
    const doc = document({
      id: "overlap-labels",
      nodes: [
        { id: "a", kind: "component", label: "Hello" },
        { id: "b", kind: "component", label: "Hello" },
      ],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        { id: "a", kind: "component", label: "Hello", x: 10, y: 10, width: 90, height: 40 },
        { id: "b", kind: "component", label: "Hello", x: 10, y: 10, width: 90, height: 40 },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toMatch(/transform="translate\([\d.]+ [\d.]+\)"/);
  });

  test("text layer group contains all labels", () => {
    const doc = document({
      id: "text-layer",
      nodes: [
        { id: "a", kind: "component", label: "Alpha" },
        { id: "b", kind: "component", label: "Beta" },
      ],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        { id: "a", kind: "component", label: "Alpha", x: 0, y: 0, width: 80, height: 40 },
        { id: "b", kind: "component", label: "Beta", x: 100, y: 0, width: 80, height: 40 },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("text-layer");
    expect(svg).toContain("Alpha");
    expect(svg).toContain("Beta");
  });

  test("uses correct font-family from style", () => {
    const doc = document({
      id: "font-test",
      nodes: [{ id: "n", kind: "component", label: "Test" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [{ id: "n", kind: "component", label: "Test", x: 0, y: 0, width: 80, height: 40 }],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain('font-family="Arial, sans-serif"');
  });

  test("respects custom font-size from theme", () => {
    const doc = document({
      id: "font-size-test",
      nodes: [{ id: "n", kind: "component", label: "Big" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [{ id: "n", kind: "component", label: "Big", x: 0, y: 0, width: 80, height: 40 }],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: diagram,
      theme: { fontSize: 20 },
    });
    expect(svg).toContain('font-size="20"');
  });

  test("labels use text-anchor middle for node labels", () => {
    const doc = document({
      id: "anchor-test",
      nodes: [{ id: "n", kind: "component", label: "Center" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        { id: "n", kind: "component", label: "Center", x: 50, y: 50, width: 100, height: 40 },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain('text-anchor="middle"');
  });

  test("multi-word label renders all words", () => {
    const doc = document({
      id: "multi-word",
      nodes: [{ id: "n", kind: "component", label: "Hello World" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        { id: "n", kind: "component", label: "Hello World", x: 0, y: 0, width: 200, height: 40 },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("Hello World");
  });

  test("unicode label renders correctly", () => {
    const doc = document({
      id: "unicode-label",
      nodes: [{ id: "n", kind: "component", label: "café résumé" }],
    });
    const diagram = positionedDiagram(doc, {
      nodes: [
        { id: "n", kind: "component", label: "café résumé", x: 0, y: 0, width: 200, height: 40 },
      ],
    });
    const svg = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(svg).toContain("caf");
  });
});
