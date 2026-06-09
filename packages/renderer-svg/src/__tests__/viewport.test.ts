import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { computeContentBounds, renderSvgSync } from "../index";

function makeDoc(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    annotations: [],
    edges: [],
    groups: [],
    id: "viewport-test",
    kind: "graph",
    nodes: [],
    schemaVersion: "1.0.0",
    ...overrides,
  } as DiagramDocument;
}

function renderWithNodes(
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  opts: {
    autoFit?: boolean;
    padding?: number;
    width?: number;
    height?: number;
    theme?: unknown;
  } = {}
): string {
  const doc = makeDoc({
    nodes: nodes.map((n) => ({ id: n.id, kind: "component", label: n.id })),
  });
  const w = opts.width ?? 400;
  const h = opts.height ?? 300;
  const minX = nodes.length > 0 ? Math.min(...nodes.map((n) => n.x)) : 0;
  const minY = nodes.length > 0 ? Math.min(...nodes.map((n) => n.y)) : 0;
  const maxX = nodes.length > 0 ? Math.max(...nodes.map((n) => n.x + n.width)) : 0;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.y + n.height)) : 0;
  const canvasBounds = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
  return renderSvgSync(doc, {
    positionedDiagram: {
      activations: [],
      canvasBounds,
      document: doc,
      edges: [],
      groups: [],
      height: h,
      nodes: nodes.map((n) => ({
        id: n.id,
        kind: "component",
        label: n.id,
        ...n,
        contentLayout: { icons: [], label: { x: 8, y: 10, lines: [n.id] } },
        labelLines: [n.id],
      })),
      width: w,
    },
    autoFit: opts.autoFit,
    padding: opts.padding,
  });
}

describe("viewport and sizing", () => {
  describe("autoFit", () => {
    test("autoFit=true produces viewBox matching content bounds", () => {
      const svg = renderWithNodes([{ id: "box", x: 10, y: 20, width: 50, height: 30 }], {
        autoFit: true,
        padding: 0,
      });
      expect(svg).toContain('viewBox="10 20 50 30"');
    });

    test("autoFit with single node produces correct viewBox", () => {
      const svg = renderWithNodes([{ id: "solo", x: 100, y: 200, width: 80, height: 60 }], {
        autoFit: true,
        padding: 0,
      });
      expect(svg).toContain('viewBox="100 200 80 60"');
    });

    test("autoFit with multiple nodes uses bounding box", () => {
      const svg = renderWithNodes(
        [
          { id: "a", x: 10, y: 10, width: 30, height: 20 },
          { id: "b", x: 200, y: 150, width: 40, height: 30 },
        ],
        { autoFit: true, padding: 0 }
      );
      expect(svg).toContain('viewBox="10 10 230 170"');
    });

    test("autoFit without padding defaults to 20px padding", () => {
      const svg = renderWithNodes([{ id: "box", x: 50, y: 50, width: 100, height: 50 }], {
        autoFit: true,
      });
      expect(svg).toContain('viewBox="30 30 140 90"');
    });
  });

  describe("padding", () => {
    test("padding=0 produces tight viewBox", () => {
      const svg = renderWithNodes([{ id: "tight", x: 10, y: 20, width: 30, height: 40 }], {
        autoFit: true,
        padding: 0,
      });
      expect(svg).toContain('viewBox="10 20 30 40"');
    });

    test("padding=5 adds 5px around content", () => {
      const svg = renderWithNodes([{ id: "pad5", x: 10, y: 20, width: 30, height: 40 }], {
        autoFit: true,
        padding: 5,
      });
      expect(svg).toContain('viewBox="5 15 40 50"');
    });

    test("padding=50 adds 50px around content", () => {
      const svg = renderWithNodes([{ id: "pad50", x: 100, y: 100, width: 50, height: 50 }], {
        autoFit: true,
        padding: 50,
      });
      expect(svg).toContain('viewBox="50 50 150 150"');
    });

    test("padding increases both width and height", () => {
      const svg = renderWithNodes([{ id: "padcheck", x: 0, y: 0, width: 100, height: 100 }], {
        autoFit: true,
        padding: 10,
      });
      expect(svg).toContain('viewBox="-10 -10 120 120"');
    });
  });

  describe("fixed width and height", () => {
    test("without autoFit, uses positionedDiagram dimensions", () => {
      const svg = renderWithNodes([{ id: "fixed", x: 10, y: 10, width: 50, height: 30 }], {
        width: 400,
        height: 300,
      });
      expect(svg).toContain('width="400"');
      expect(svg).toContain('height="300"');
      expect(svg).toContain('viewBox="0 0 400 300"');
    });

    test("explicit width/height override positionedDiagram defaults", () => {
      const doc = makeDoc({ nodes: [{ id: "n", kind: "component", label: "N" }] });
      const svg = renderSvgSync(doc, {
        positionedDiagram: {
          activations: [],
          canvasBounds: { x: 0, y: 0, width: 300, height: 200 },
          document: doc,
          edges: [],
          groups: [],
          height: 200,
          nodes: [
            {
              id: "n",
              kind: "component",
              label: "N",
              x: 0,
              y: 0,
              width: 50,
              height: 30,
              contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["N"] } },
              labelLines: ["N"],
            },
          ],
          width: 300,
        },
        width: 800,
        height: 600,
      });
      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="600"');
    });
  });

  describe("viewport culling", () => {
    test("node outside viewport is culled", () => {
      const doc = makeDoc({
        id: "cull-test",
        nodes: [
          { id: "visible", kind: "component", label: "Vis" },
          { id: "hidden", kind: "component", label: "Hide" },
        ],
      });
      const svg = renderSvgSync(doc, {
        positionedDiagram: {
          activations: [],
          canvasBounds: { x: 0, y: 0, width: 300, height: 200 },
          document: doc,
          edges: [],
          groups: [],
          height: 200,
          nodes: [
            {
              id: "visible",
              kind: "component",
              label: "Vis",
              x: 10,
              y: 10,
              width: 50,
              height: 30,
              contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["Vis"] } },
              labelLines: ["Vis"],
            },
            {
              id: "hidden",
              kind: "component",
              label: "Hide",
              x: 500,
              y: 500,
              width: 50,
              height: 30,
              contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["Hide"] } },
              labelLines: ["Hide"],
            },
          ],
          width: 300,
        },
        viewport: { x: 0, y: 0, width: 100, height: 100 },
      });
      expect(svg).toContain("Vis");
      expect(svg).not.toContain("Hide");
    });

    test("edge outside viewport is culled", () => {
      const doc = makeDoc({
        id: "edge-cull-test",
        nodes: [
          { id: "a", kind: "component", label: "A" },
          { id: "b", kind: "component", label: "B" },
        ],
        edges: [
          { id: "visible-edge", kind: "calls", sourceId: "a", targetId: "b" },
          { id: "hidden-edge", kind: "calls", sourceId: "a", targetId: "b" },
        ],
      });
      const svg = renderSvgSync(doc, {
        positionedDiagram: {
          activations: [],
          canvasBounds: { x: 0, y: 0, width: 300, height: 200 },
          document: doc,
          edges: [
            {
              id: "visible-edge",
              kind: "calls",
              sourceId: "a",
              targetId: "b",
              waypoints: [
                { x: 10, y: 10 },
                { x: 50, y: 10 },
              ],
              labelPosition: { x: 30, y: 10 },
              labelLines: [],
            },
            {
              id: "hidden-edge",
              kind: "calls",
              sourceId: "a",
              targetId: "b",
              waypoints: [
                { x: 500, y: 500 },
                { x: 600, y: 600 },
              ],
              labelPosition: { x: 550, y: 550 },
              labelLines: [],
            },
          ],
          groups: [],
          height: 200,
          nodes: [
            {
              id: "a",
              kind: "component",
              label: "A",
              x: 0,
              y: 0,
              width: 30,
              height: 20,
              contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["A"] } },
              labelLines: ["A"],
            },
            {
              id: "b",
              kind: "component",
              label: "B",
              x: 50,
              y: 0,
              width: 30,
              height: 20,
              contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["B"] } },
              labelLines: ["B"],
            },
          ],
          width: 300,
        },
        viewport: { x: 0, y: 0, width: 100, height: 100 },
      });
      expect(svg).toContain("visible-edge");
      expect(svg).not.toContain("hidden-edge");
    });

    test("group outside viewport is culled", () => {
      const doc = makeDoc({
        id: "group-cull-test",
        groups: [
          { id: "vis-group", kind: "boundary", label: "Visible", childIds: [] },
          { id: "hid-group", kind: "boundary", label: "Hidden", childIds: [] },
        ],
      });
      const svg = renderSvgSync(doc, {
        positionedDiagram: {
          activations: [],
          canvasBounds: { x: 0, y: 0, width: 300, height: 200 },
          document: doc,
          edges: [],
          groups: [
            {
              id: "vis-group",
              kind: "boundary",
              label: "Visible",
              childIds: [],
              x: 0,
              y: 0,
              width: 80,
              height: 40,
              labelLines: ["Visible"],
            },
            {
              id: "hid-group",
              kind: "boundary",
              label: "Hidden",
              childIds: [],
              x: 500,
              y: 500,
              width: 80,
              height: 40,
              labelLines: ["Hidden"],
            },
          ],
          height: 200,
          nodes: [],
          width: 300,
        },
        viewport: { x: 0, y: 0, width: 100, height: 100 },
      });
      expect(svg).toContain("Visible");
      expect(svg).not.toContain("Hidden");
    });
  });

  describe("computeContentBounds", () => {
    test("empty diagram returns positionedDiagram dimensions", () => {
      const doc = makeDoc({ id: "empty-bounds" });
      const bounds = computeContentBounds({
        activations: [],
        canvasBounds: { x: 0, y: 0, width: 400, height: 300 },
        document: doc,
        edges: [],
        groups: [],
        height: 300,
        nodes: [],
        width: 400,
      });
      expect(bounds).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    });

    test("single node bounds match node rect", () => {
      const doc = makeDoc({ id: "single-bounds" });
      const bounds = computeContentBounds({
        activations: [],
        canvasBounds: { x: 10, y: 20, width: 30, height: 40 },
        document: doc,
        edges: [],
        groups: [],
        height: 300,
        nodes: [
          {
            id: "n",
            kind: "component",
            label: "N",
            x: 10,
            y: 20,
            width: 30,
            height: 40,
            contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["N"] } },
            labelLines: ["N"],
          },
        ],
        width: 400,
      });
      expect(bounds).toEqual({ x: 10, y: 20, width: 30, height: 40 });
    });

    test("multiple nodes produce encompassing bounds", () => {
      const doc = makeDoc({ id: "multi-bounds" });
      const bounds = computeContentBounds({
        activations: [],
        canvasBounds: { x: 10, y: 10, width: 120, height: 100 },
        document: doc,
        edges: [],
        groups: [],
        height: 300,
        nodes: [
          {
            id: "a",
            kind: "component",
            label: "A",
            x: 10,
            y: 10,
            width: 20,
            height: 20,
            contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["A"] } },
            labelLines: ["A"],
          },
          {
            id: "b",
            kind: "component",
            label: "B",
            x: 100,
            y: 80,
            width: 30,
            height: 30,
            contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["B"] } },
            labelLines: ["B"],
          },
        ],
        width: 400,
      });
      expect(bounds).toEqual({ x: 10, y: 10, width: 120, height: 100 });
    });

    test("edge waypoints are included in bounds", () => {
      const doc = makeDoc({ id: "edge-bounds" });
      const bounds = computeContentBounds({
        activations: [],
        canvasBounds: { x: -20, y: -10, width: 320, height: 60 },
        document: doc,
        edges: [
          {
            id: "e",
            kind: "calls",
            sourceId: "a",
            targetId: "b",
            waypoints: [
              { x: -20, y: 50 },
              { x: 300, y: -10 },
            ],
            labelPosition: { x: 140, y: 20 },
            labelLines: [],
          },
        ],
        groups: [],
        height: 300,
        nodes: [],
        width: 400,
      });
      expect(bounds).toEqual({ x: -20, y: -10, width: 320, height: 60 });
    });

    test("activation bars are included in bounds", () => {
      const doc = makeDoc({ id: "activation-bounds" });
      const bounds = computeContentBounds({
        activations: [{ id: "bar", nodeId: "a", edgeId: "e", x: 50, y: 60, width: 10, height: 20 }],
        canvasBounds: { x: 50, y: 60, width: 10, height: 20 },
        document: doc,
        edges: [],
        groups: [],
        height: 300,
        nodes: [],
        width: 400,
      });
      expect(bounds).toEqual({ x: 50, y: 60, width: 10, height: 20 });
    });

    test("groups are included in bounds", () => {
      const doc = makeDoc({ id: "group-bounds" });
      const bounds = computeContentBounds({
        activations: [],
        canvasBounds: { x: 5, y: 15, width: 80, height: 50 },
        document: doc,
        edges: [],
        groups: [
          {
            id: "g",
            kind: "boundary",
            label: "G",
            childIds: [],
            x: 5,
            y: 15,
            width: 80,
            height: 50,
            labelLines: ["G"],
          },
        ],
        height: 300,
        nodes: [],
        width: 400,
      });
      expect(bounds).toEqual({ x: 5, y: 15, width: 80, height: 50 });
    });
  });
});
