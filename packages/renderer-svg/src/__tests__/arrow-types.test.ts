import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { renderSvgSync, stableSvgId } from "../index";

function makeDoc(
  edgeOverrides: Record<string, unknown> = {},
  styles?: DiagramDocument["styles"]
): DiagramDocument {
  return {
    annotations: [],
    edges: [
      {
        id: "ab",
        kind: "calls",
        sourceId: "a",
        targetId: "b",
        direction: "forward",
        ...edgeOverrides,
      },
    ],
    groups: [],
    id: "arrow-test",
    kind: "graph",
    nodes: [
      { id: "a", kind: "component", label: "A" },
      { id: "b", kind: "component", label: "B" },
    ],
    schemaVersion: "1.0.0",
    styles,
  } as DiagramDocument;
}

function positionedDiagramForArrow(doc: DiagramDocument) {
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

function renderArrow(edgeOverrides: Record<string, unknown> = {}): string {
  const doc = makeDoc(edgeOverrides);
  return renderSvgSync(doc, { positionedDiagram: positionedDiagramForArrow(doc) });
}

function renderWithStyleRule(rule: Record<string, unknown>): string {
  const doc = makeDoc({ style: { id: "custom-arrow" } }, { rules: { "custom-arrow": rule } });
  return renderSvgSync(doc, { positionedDiagram: positionedDiagramForArrow(doc) });
}

const idPrefix = stableSvgId("drawspec", "arrow-test");

describe("arrowhead markers", () => {
  describe("filled-triangle marker", () => {
    test("produces marker definition in defs", () => {
      const svg = renderArrow();
      expect(svg).toContain(`id="${idPrefix}-marker-filled-triangle"`);
    });

    test("marker has correct path shape", () => {
      const svg = renderArrow();
      expect(svg).toContain('d="M 0 0 L 8 4 L 0 8 z"');
    });

    test("marker is referenced via marker-end for forward direction", () => {
      const svg = renderArrow();
      expect(svg).toContain(`marker-end="url(#${idPrefix}-marker-filled-triangle)"`);
    });
  });

  describe("open-arrow marker", () => {
    test("produces marker definition in defs", () => {
      const svg = renderWithStyleRule({ arrowEnd: "open-arrow" });
      expect(svg).toContain(`id="${idPrefix}-marker-open-arrow"`);
    });

    test("marker has open arrow path (no fill)", () => {
      const svg = renderWithStyleRule({ arrowEnd: "open-arrow" });
      expect(svg).toContain('d="M 0 0 L 8 4 L 0 8" fill="none"');
    });

    test("marker is referenced on edge", () => {
      const svg = renderWithStyleRule({ arrowEnd: "open-arrow" });
      expect(svg).toContain(`marker-end="url(#${idPrefix}-marker-open-arrow)"`);
    });
  });

  describe("open-triangle marker", () => {
    test("produces marker definition in defs", () => {
      const svg = renderWithStyleRule({ arrowEnd: "open-triangle" });
      expect(svg).toContain(`id="${idPrefix}-marker-open-triangle"`);
    });

    test("marker has open triangle path", () => {
      const svg = renderWithStyleRule({ arrowEnd: "open-triangle" });
      expect(svg).toContain('d="M 0 0 L 8 4 L 0 8" fill="none"');
    });
  });

  describe("diamond marker", () => {
    test("produces marker definition in defs", () => {
      const svg = renderWithStyleRule({ arrowEnd: "diamond" });
      expect(svg).toContain(`id="${idPrefix}-marker-diamond"`);
    });

    test("marker has diamond path", () => {
      const svg = renderWithStyleRule({ arrowEnd: "diamond" });
      expect(svg).toContain('d="M 0 4 L 4 0 L 8 4 L 4 8 z"');
    });
  });

  describe("circle marker", () => {
    test("produces marker definition in defs", () => {
      const svg = renderWithStyleRule({ arrowEnd: "circle" });
      expect(svg).toContain(`id="${idPrefix}-marker-circle"`);
    });

    test("marker uses circle element with correct attributes", () => {
      const svg = renderWithStyleRule({ arrowEnd: "circle" });
      expect(svg).toContain('<circle cx="4" cy="4"');
      expect(svg).toContain('r="3"');
    });
  });

  describe("cross marker", () => {
    test("produces marker definition in defs", () => {
      const svg = renderWithStyleRule({ arrowEnd: "cross" });
      expect(svg).toContain(`id="${idPrefix}-marker-cross"`);
    });

    test("marker has cross path", () => {
      const svg = renderWithStyleRule({ arrowEnd: "cross" });
      expect(svg).toContain('d="M 0 0 L 8 8 M 0 8 L 8 0"');
    });
  });

  describe('"none" arrow marker', () => {
    test("produces no marker-end reference", () => {
      const svg = renderWithStyleRule({ arrowEnd: "none" });
      expect(svg).not.toContain("marker-end=");
    });
  });

  describe("backward arrows", () => {
    test("uses marker-start for backward direction", () => {
      const svg = renderArrow({ direction: "backward" });
      expect(svg).toContain(`marker-start="url(#${idPrefix}-marker-filled-triangle)"`);
    });

    test("does not use marker-end for backward direction", () => {
      const svg = renderArrow({ direction: "backward" });
      expect(svg).not.toContain("marker-end=");
    });
  });

  describe("bidirectional arrows", () => {
    test("uses both marker-start and marker-end", () => {
      const svg = renderArrow({ direction: "bidirectional" });
      expect(svg).toContain(`marker-start="url(#${idPrefix}-marker-filled-triangle)"`);
      expect(svg).toContain(`marker-end="url(#${idPrefix}-marker-filled-triangle)"`);
    });

    test("can have different start and end markers", () => {
      const _svg = renderWithStyleRule({
        arrowStart: "diamond",
        arrowEnd: "open-arrow",
        direction: "bidirectional",
      });
      // The edge direction must be bidirectional for both markers to show
      const doc = makeDoc(
        { direction: "bidirectional", style: { id: "bi-arrow" } },
        { rules: { "bi-arrow": { arrowStart: "diamond", arrowEnd: "open-arrow" } } }
      );
      const biSvg = renderSvgSync(doc, { positionedDiagram: positionedDiagramForArrow(doc) });
      expect(biSvg).toContain(`marker-start="url(#${idPrefix}-marker-diamond)"`);
      expect(biSvg).toContain(`marker-end="url(#${idPrefix}-marker-open-arrow)"`);
    });
  });

  describe("marker attributes", () => {
    test("markers have viewBox 0 0 8 8", () => {
      const svg = renderArrow();
      expect(svg).toContain('viewBox="0 0 8 8"');
    });

    test("markers have orient auto", () => {
      const svg = renderArrow();
      expect(svg).toContain('orient="auto"');
    });

    test("markers have correct refX and refY", () => {
      const svg = renderArrow();
      expect(svg).toContain('refX="8"');
      expect(svg).toContain('refY="4"');
    });
  });
});
