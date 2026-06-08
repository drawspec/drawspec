import { describe, expect, test } from "bun:test";
import type { DiagramDocument, LabelRotation, NodeShapeSpec } from "@drawspec/core";
import { type PositionedDiagram, sequenceLayout, simpleGraphLayout } from "@drawspec/layout";
import { wrapTextContent } from "@drawspec/text-measure";
import {
  computeContentBounds,
  type LineStyle,
  measureText,
  renderSvg,
  renderSvgSync,
  stableSvgId,
} from "../index";

const edgeMarkerPrefix = stableSvgId("drawspec", "edge-marker-test");

function document(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    annotations: [],
    edges: [],
    groups: [],
    id: "doc",
    kind: "graph",
    nodes: [],
    schemaVersion: "1.0.0",
    ...overrides,
  } as DiagramDocument;
}

const architectureDoc = document({
  id: "architecture-demo",
  kind: "architecture",
  metadata: { description: "A small architecture diagram" },
  nodes: [
    { id: "web", kind: "container", label: "Web App", tags: ["frontend"] },
    { id: "api", kind: "person", label: "API" },
    { id: "db", kind: "database", label: "Orders DB" },
  ],
  edges: [
    { id: "calls", kind: "http", sourceId: "web", targetId: "api", label: "calls" },
    { id: "stores", kind: "sql", sourceId: "api", targetId: "db", label: "stores" },
  ],
  groups: [
    { id: "boundary", kind: "container", label: "Production", childIds: ["web", "api", "db"] },
  ],
  styles: {
    rules: {
      "tag:frontend": { fill: "#dbeafe", stroke: "#1d4ed8" },
    },
  },
});

const sequenceDoc = document({
  id: "checkout-sequence",
  kind: "sequence",
  title: "Checkout Sequence",
  nodes: [
    { id: "user", kind: "actor", label: "User" },
    { id: "shop", kind: "participant", label: "Shop" },
    { id: "payments", kind: "participant", label: "Payments" },
  ],
  edges: [
    { id: "start", kind: "message", sourceId: "user", targetId: "shop", label: "checkout" },
    { id: "charge", kind: "message", sourceId: "shop", targetId: "payments", label: "charge" },
    { id: "ok", kind: "message", sourceId: "payments", targetId: "shop", label: "ok" },
  ],
  groups: [
    {
      id: "payment-alt",
      kind: "alt",
      childIds: ["charge", "ok"],
      label: "Payment result",
      metadata: {
        operands: [
          { condition: "authorized", childIds: ["ok"] },
          { condition: "declined", childIds: [] },
        ],
      },
    },
  ],
});

const shapeFixtures: Array<{ id: string; shape: NodeShapeSpec }> = [
  { id: "diamond", shape: { type: "diamond" } },
  { id: "circle", shape: { type: "circle" } },
  { id: "bullseye", shape: { type: "bullseye" } },
  { id: "sync-bar", shape: { type: "sync-bar" } },
  { id: "ellipse", shape: { type: "ellipse" } },
  { id: "parallelogram", shape: { type: "parallelogram" } },
  { id: "document", shape: { type: "document" } },
  { id: "tabbed-rect", shape: { type: "tabbed-rect" } },
  { id: "note", shape: { type: "note" } },
  { id: "hexagon", shape: { type: "hexagon" } },
];

const shapeLibraryDoc = document({
  id: "shape-library",
  kind: "graph",
  nodes: shapeFixtures.map(({ id, shape }) => ({ id, kind: id, label: id, shape })),
});

async function architectureSvg(): Promise<string> {
  const positionedDiagram = await simpleGraphLayout().layout(architectureDoc, { direction: "LR" });
  return renderSvg(architectureDoc, { positionedDiagram });
}

async function sequenceSvg(): Promise<string> {
  const positionedDiagram = await sequenceLayout().layout(sequenceDoc);
  return renderSvg(sequenceDoc, { positionedDiagram });
}

async function richTextSvg(): Promise<string> {
  const doc = document({
    id: "rich-text-golden",
    nodes: [
      {
        id: "api",
        kind: "component",
        label: [{ text: "API", bold: true }, { text: " calls " }, { text: "checkout", code: true }],
      },
      { id: "worker", kind: "component", label: [{ text: "worker", italic: true }] },
    ],
    edges: [
      {
        id: "api-worker",
        kind: "calls",
        sourceId: "api",
        targetId: "worker",
        label: [
          { text: "publishes", bold: true },
          { text: " event", italic: true },
        ],
      },
    ],
  });
  const positionedDiagram = await simpleGraphLayout().layout(doc, { direction: "LR" });
  return renderSvg(doc, { positionedDiagram });
}

async function edgeSvg(
  edgeOverrides: Partial<DiagramDocument["edges"][number]> = {}
): Promise<string> {
  const doc = document({
    id: "edge-marker-test",
    kind: "graph",
    nodes: [
      { id: "a", kind: "component", label: "A" },
      { id: "b", kind: "component", label: "B" },
    ],
    edges: [{ id: "ab", kind: "calls", sourceId: "a", targetId: "b", ...edgeOverrides }],
    groups: [],
    styles: {
      rules: {
        "tag:async": { arrowEnd: "open-arrow", arrowStart: "diamond" },
      },
    },
  });
  const positionedDiagram = await simpleGraphLayout().layout(doc);
  return renderSvg(doc, { positionedDiagram });
}

async function expectGolden(name: string, svg: string): Promise<void> {
  const path = new URL(`./golden/${name}.svg`, import.meta.url).pathname;
  if (Bun.env.UPDATE_GOLDEN === "1") {
    await Bun.write(path, svg);
  }
  expect(await Bun.file(path).text()).toBe(svg);
}

function lineStyleDocument(rule: Record<string, string | number>): DiagramDocument {
  return document({
    id: "line-style-test",
    kind: "graph",
    nodes: [
      { id: "a", kind: "component", label: "A" },
      { id: "b", kind: "component", label: "B" },
    ],
    edges: [
      {
        id: "ab",
        kind: "calls",
        sourceId: "a",
        style: { id: "edge-style" },
        targetId: "b",
      },
    ],
    groups: [],
    styles: { rules: { "edge-style": rule } },
  });
}

function positionedLineStyleDiagram(doc: DiagramDocument): PositionedDiagram {
  const edge = doc.edges[0];
  if (edge === undefined) {
    throw new Error("line style test document must contain an edge");
  }
  const waypoints = [
    { x: 30, y: 30 },
    { x: 170, y: 30 },
  ];
  return {
    activations: [],
    document: doc,
    canvasBounds: { x: 0, y: 0, width: 200, height: 80 },
    edges: [
      {
        ...edge,
        waypoints,
        labelPosition: { x: 100, y: 30 },
        labelLines: edge.label ? wrapTextContent(edge.label, 140, 14) : [],
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
        labelLines: ["A"],
        contentLayout: { icons: [], label: { x: 30, y: 30, lines: ["A"] } },
      },
      {
        id: "b",
        kind: "component",
        label: "B",
        x: 140,
        y: 10,
        width: 60,
        height: 40,
        labelLines: ["B"],
        contentLayout: { icons: [], label: { x: 170, y: 30, lines: ["B"] } },
      },
    ],
    width: 200,
  };
}

function renderLineStyleRule(rule: Record<string, string | number>): string {
  const doc = lineStyleDocument(rule);
  return renderSvgSync(doc, { positionedDiagram: positionedLineStyleDiagram(doc) });
}

function positionedDiagram(overrides: Partial<PositionedDiagram> = {}): PositionedDiagram {
  const doc = document({ id: "positioned" });
  const base: PositionedDiagram = {
    activations: [],
    document: doc,
    canvasBounds: { x: 0, y: 0, width: 400, height: 300 },
    edges: [],
    groups: [],
    height: 300,
    nodes: [],
    width: 400,
    ...overrides,
  };
  if (overrides.canvasBounds === undefined) {
    const nodes = base.nodes;
    const edges = base.edges;
    const groups = base.groups;
    const allX: number[] = [];
    const allY: number[] = [];
    for (const node of nodes) {
      allX.push(node.x, node.x + node.width);
      allY.push(node.y, node.y + node.height);
    }
    for (const edge of edges) {
      for (const pt of edge.waypoints) {
        allX.push(pt.x);
        allY.push(pt.y);
      }
      if (edge.labelPosition) {
        allX.push(edge.labelPosition.x);
        allY.push(edge.labelPosition.y);
      }
    }
    for (const group of groups) {
      allX.push(group.x, group.x + group.width);
      allY.push(group.y, group.y + group.height);
    }
    if (allX.length > 0) {
      const minX = Math.min(...allX);
      const minY = Math.min(...allY);
      const maxX = Math.max(...allX);
      const maxY = Math.max(...allY);
      base.canvasBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }
  return base;
}

function edgeLabelRotationSvg(options: {
  waypoints: PositionedDiagram["edges"][number]["waypoints"];
  documentRotation?: LabelRotation;
  edgeRotation?: LabelRotation;
}): string {
  const doc = document({
    id: "edge-label-rotation-test",
    labelRotation: options.documentRotation,
    nodes: [
      { id: "a", kind: "component", label: "A" },
      { id: "b", kind: "component", label: "B" },
    ],
    edges: [
      {
        id: "e1",
        kind: "calls",
        sourceId: "a",
        targetId: "b",
        label: "calls",
        labelRotation: options.edgeRotation,
      },
    ],
  });
  const edge = doc.edges[0];
  if (edge === undefined) {
    throw new Error("edge label rotation test document must contain an edge");
  }
  const wps = options.waypoints;
  // For 2-waypoint edges, compute the actual midpoint; otherwise use middle index
  const midIdx = wps.length === 2 ? 0 : Math.floor(wps.length / 2);
  const labelPosition =
    wps.length === 2
      ? { x: (wps[0].x + wps[1].x) / 2, y: (wps[0].y + wps[1].y) / 2 }
      : { x: wps[midIdx].x, y: wps[midIdx].y };
  return renderSvgSync(doc, {
    positionedDiagram: positionedDiagram({
      document: doc,
      edges: [{ ...edge, waypoints: options.waypoints, labelPosition, labelLines: ["calls"] }],
      height: 240,
      width: 240,
    }),
  });
}

function edgeLabelRotationTransform(svg: string): string | undefined {
  return svg.match(/transform="(rotate\([^"]+\))"/)?.[1];
}

describe("SvgRenderer", () => {
  test("renders the same positioned diagram byte-identically", async () => {
    const positionedDiagram = await simpleGraphLayout().layout(architectureDoc, {
      direction: "LR",
    });
    const first = await renderSvg(architectureDoc, { positionedDiagram });
    const second = renderSvgSync(architectureDoc, {
      positionedDiagram: { ...positionedDiagram, nodes: [...positionedDiagram.nodes] },
    });
    expect(second).toBe(first);
  });

  test("computes content bounds across positioned elements", () => {
    const doc = document({ id: "bounds" });
    const diagram = positionedDiagram({
      document: doc,
      nodes: [{ id: "node", kind: "component", x: 10, y: 20, width: 30, height: 40 }],
      edges: [
        {
          id: "edge",
          kind: "calls",
          sourceId: "node",
          targetId: "node",
          waypoints: [
            { x: -20, y: 200 },
            { x: 200, y: -30 },
          ],
        },
      ],
      groups: [
        { id: "group", kind: "boundary", childIds: ["node"], x: -5, y: -10, width: 5, height: 5 },
      ],
      activations: [
        { id: "bar", nodeId: "node", edgeId: "edge", x: 100, y: 50, width: 10, height: 20 },
      ],
    });

    expect(computeContentBounds(diagram)).toEqual({ x: -20, y: -30, width: 220, height: 230 });
  });

  test("renders the expanded node shape library", async () => {
    const positionedDiagram: PositionedDiagram = {
      activations: [],
      document: shapeLibraryDoc,
      canvasBounds: { x: 0, y: 0, width: 760, height: 300 },
      edges: [],
      groups: [],
      height: 300,
      nodes: shapeLibraryDoc.nodes.map((node, index) => ({
        ...node,
        x: 20 + (index % 5) * 150,
        y: 20 + Math.floor(index / 5) * 130,
        width: node.shape?.type === "sync-bar" ? 120 : 100,
        height: node.shape?.type === "sync-bar" ? 18 : 72,
        labelLines: [node.label as string],
        contentLayout: {
          icons: [],
          label: {
            x: 20 + (index % 5) * 150 + 50,
            y: 20 + Math.floor(index / 5) * 130 + 36,
            lines: [node.label as string],
          },
        },
      })),
      width: 760,
    };
    const svg = renderSvgSync(shapeLibraryDoc, { positionedDiagram });
    await expectGolden("shape-library", svg);
  });

  test("auto-fit viewBox encompasses all positioned content", () => {
    const doc = document({ id: "auto-fit" });
    const diagram = positionedDiagram({
      document: doc,
      nodes: [
        {
          id: "left",
          kind: "component",
          x: 50,
          y: 80,
          width: 100,
          height: 40,
          labelLines: [],
          contentLayout: { icons: [], label: { x: 100, y: 100, lines: [] } },
        },
        {
          id: "right",
          kind: "component",
          x: 250,
          y: 120,
          width: 80,
          height: 60,
          labelLines: [],
          contentLayout: { icons: [], label: { x: 290, y: 150, lines: [] } },
        },
      ],
      edges: [
        {
          id: "wide",
          kind: "calls",
          sourceId: "left",
          targetId: "right",
          waypoints: [
            { x: 30, y: 90 },
            { x: 360, y: 200 },
          ],
        },
      ],
    });

    const svg = renderSvgSync(doc, { positionedDiagram: diagram, autoFit: true, padding: 0 });

    expect(svg).toContain('viewBox="30 80 330 120"');
    expect(svg).toContain('width="330"');
    expect(svg).toContain('height="120"');
    expect(svg).toContain('<rect fill="#ffffff" height="120" width="330" x="30" y="80" />');
  });

  test("auto-fit padding expands the viewBox around content", () => {
    const doc = document({ id: "auto-fit-padding" });
    const diagram = positionedDiagram({
      document: doc,
      nodes: [
        {
          id: "box",
          kind: "component",
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          labelLines: [],
          contentLayout: { icons: [], label: { x: 25, y: 40, lines: [] } },
        },
      ],
    });

    const svg = renderSvgSync(doc, { positionedDiagram: diagram, autoFit: true, padding: 5 });

    expect(svg).toContain('viewBox="5 15 40 50"');
    expect(svg).toContain('width="40"');
    expect(svg).toContain('height="50"');
  });

  test("auto-fit single-node diagrams keep a non-degenerate viewBox", () => {
    const doc = document({ id: "single-node" });
    const diagram = positionedDiagram({
      document: doc,
      nodes: [
        {
          id: "box",
          kind: "component",
          x: 100,
          y: 200,
          width: 120,
          height: 80,
          labelLines: [],
          contentLayout: { icons: [], label: { x: 160, y: 240, lines: [] } },
        },
      ],
    });

    const svg = renderSvgSync(doc, { positionedDiagram: diagram, autoFit: true, padding: 0 });

    expect(svg).toContain('viewBox="100 200 120 80"');
    expect(svg).toContain('width="120"');
    expect(svg).toContain('height="80"');
  });

  test("emits preserveAspectRatio when provided", () => {
    const doc = document({ id: "preserve-aspect-ratio" });
    const diagram = positionedDiagram({
      document: doc,
      nodes: [
        {
          id: "box",
          kind: "component",
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          labelLines: [],
          contentLayout: { icons: [], label: { x: 50, y: 25, lines: [] } },
        },
      ],
    });

    const svg = renderSvgSync(doc, {
      positionedDiagram: diagram,
      autoFit: true,
      preserveAspectRatio: "xMinYMin slice",
    });

    expect(svg).toContain('preserveAspectRatio="xMinYMin slice"');
  });

  test("keeps explicit-dimension rendering unchanged when auto-fit is disabled", () => {
    const doc = document({ id: "backward-compatible" });
    const diagram = positionedDiagram({
      document: doc,
      nodes: [
        {
          id: "box",
          kind: "component",
          x: 100,
          y: 200,
          width: 120,
          height: 80,
          labelLines: [],
          contentLayout: { icons: [], label: { x: 160, y: 240, lines: [] } },
        },
      ],
    });

    const implicit = renderSvgSync(doc, { positionedDiagram: diagram });
    const explicit = renderSvgSync(doc, {
      positionedDiagram: diagram,
      width: diagram.width,
      height: diagram.height,
    });

    expect(implicit).toBe(explicit);
    expect(implicit).toContain('viewBox="0 0 400 300"');
  });

  test("includes title, desc, ARIA references, and stable IDs", async () => {
    const svg = await sequenceSvg();
    expect(svg).toContain('<title id="drawspec-checkout-sequence-1nkmrpb-title-0j3l0qk">');
    expect(svg).toContain('<desc id="drawspec-checkout-sequence-1nkmrpb-desc-0331j8r">');
    expect(svg).toContain('aria-labelledby="drawspec-checkout-sequence-1nkmrpb-title-0j3l0qk"');
    expect(svg).not.toContain("Date");
    expect(stableSvgId("drawspec", "Checkout Sequence", "node:user")).toBe(
      "drawspec-checkout-sequence-node-user-1qgq1a4"
    );
  });

  test("renders labels as SVG text elements", async () => {
    const svg = await architectureSvg();
    expect(svg).toContain("Web App");
    expect(svg).toContain("<text ");
    expect(svg).not.toContain('<path id="text');
  });

  test("renders rich node labels with bold tspans", () => {
    const doc = document({
      id: "rich-bold-test",
      nodes: [{ id: "api", kind: "component", label: [{ text: "API", bold: true }] }],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: positionedDiagram({
        document: doc,
        nodes: [
          {
            id: "api",
            kind: "component",
            label: doc.nodes[0]?.label,
            x: 0,
            y: 0,
            width: 120,
            height: 56,
            labelLines: [[{ text: "API", bold: true }]],
            contentLayout: {
              icons: [],
              label: { x: 60, y: 28, lines: [[{ text: "API", bold: true }]] },
            },
          },
        ],
      }),
    });
    expect(svg).toContain("<tspan");
    expect(svg).toContain('font-weight="700"');
  });

  test("renders rich node labels with italic tspans", () => {
    const doc = document({
      id: "rich-italic-test",
      nodes: [{ id: "api", kind: "component", label: [{ text: "async", italic: true }] }],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: positionedDiagram({
        document: doc,
        nodes: [
          {
            id: "api",
            kind: "component",
            label: doc.nodes[0]?.label,
            x: 0,
            y: 0,
            width: 120,
            height: 56,
            labelLines: [[{ text: "async", italic: true }]],
            contentLayout: {
              icons: [],
              label: { x: 60, y: 28, lines: [[{ text: "async", italic: true }]] },
            },
          },
        ],
      }),
    });
    expect(svg).toContain('font-style="italic"');
  });

  test("renders rich node labels with code tspans", () => {
    const doc = document({
      id: "rich-code-test",
      nodes: [{ id: "api", kind: "component", label: [{ text: "checkout", code: true }] }],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: positionedDiagram({
        document: doc,
        nodes: [
          {
            id: "api",
            kind: "component",
            label: doc.nodes[0]?.label,
            x: 0,
            y: 0,
            width: 120,
            height: 56,
            labelLines: [[{ text: "checkout", code: true }]],
            contentLayout: {
              icons: [],
              label: { x: 60, y: 28, lines: [[{ text: "checkout", code: true }]] },
            },
          },
        ],
      }),
    });
    expect(svg).toContain(
      'font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"'
    );
  });

  test("renders mixed rich edge labels deterministically", () => {
    const doc = document({
      id: "rich-mixed-test",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "ab",
          kind: "calls",
          sourceId: "a",
          targetId: "b",
          label: [
            { text: "calls", bold: true },
            { text: " `api`", code: true },
            { text: " now", italic: true },
          ],
        },
      ],
    });
    const diagram = positionedLineStyleDiagram(doc);
    const first = renderSvgSync(doc, { positionedDiagram: diagram });
    const second = renderSvgSync(doc, { positionedDiagram: diagram });
    expect(second).toBe(first);
    expect(first).toContain("<tspan");
    expect(first).toContain('font-weight="700"');
    expect(first).toContain('font-style="italic"');
    expect(first).toContain(
      'font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"'
    );
  });

  test("renders multiline rich labels as separate text lines", () => {
    const label = [
      { text: "First", bold: true },
      { text: "\nSecond", code: true },
    ];
    const doc = document({
      id: "rich-multiline-test",
      nodes: [{ id: "api", kind: "component", label }],
    });
    const svg = renderSvgSync(doc, {
      positionedDiagram: positionedDiagram({
        document: doc,
        nodes: [
          {
            id: "api",
            kind: "component",
            label,
            labelLines: [[label[0]], [{ text: "Second", code: true }]],
            x: 0,
            y: 0,
            width: 160,
            height: 80,
            contentLayout: {
              icons: [],
              label: { x: 80, y: 40, lines: [[label[0]], [{ text: "Second", code: true }]] },
            },
          },
        ],
      }),
    });
    expect(svg.match(/<text /g)?.length).toBe(2);
    expect(svg).toContain("First");
    expect(svg).toContain("Second");
  });

  test("renders node shapes by kind", async () => {
    const svg = await architectureSvg();
    expect(svg).toContain('rx="12"');
    expect(svg).toContain("<circle ");
    expect(svg).toContain("C 520 35.333 640 35.333 640 54");
  });

  test("renders edges as paths with deterministic arrow markers and labels", async () => {
    const svg = await architectureSvg();
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-filled-triangle"');
    expect(svg).toContain(
      'marker-end="url(#drawspec-architecture-demo-1o08l38-marker-filled-triangle)"'
    );
    expect(svg).toContain("calls");
  });

  test("defines each supported arrow marker shape", async () => {
    const svg = await architectureSvg();
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-filled-triangle"');
    expect(svg).toContain('d="M 0 0 L 8 4 L 0 8 z" fill="#475569"');
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-open-triangle"');
    expect(svg).toContain('d="M 0 0 L 8 4 L 0 8" fill="none" stroke="#475569"');
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-open-arrow"');
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-diamond"');
    expect(svg).toContain('d="M 0 4 L 4 0 L 8 4 L 4 8 z" fill="#475569"');
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-circle"');
    expect(svg).toContain('<circle cx="4" cy="4" fill="#475569" r="3" />');
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-cross"');
    expect(svg).toContain('d="M 0 0 L 8 8 M 0 8 L 8 0" fill="none" stroke="#475569"');
  });

  test("uses marker-start for backward edges", async () => {
    const svg = await edgeSvg({ direction: "backward" });
    expect(svg).toContain(`marker-start="url(#${edgeMarkerPrefix}-marker-filled-triangle)"`);
    expect(svg).not.toContain(`marker-end="url(#${edgeMarkerPrefix}-marker-filled-triangle)"`);
  });

  test("uses both marker-start and marker-end for bidirectional edges", async () => {
    const svg = await edgeSvg({ direction: "bidirectional" });
    expect(svg).toContain(`marker-start="url(#${edgeMarkerPrefix}-marker-filled-triangle)"`);
    expect(svg).toContain(`marker-end="url(#${edgeMarkerPrefix}-marker-filled-triangle)"`);
  });

  test("omits edge marker references when direction is none", async () => {
    const svg = await edgeSvg({ direction: "none" });
    expect(svg).not.toContain('marker-start="url(');
    expect(svg).not.toContain('marker-end="url(');
  });

  test("allows style rules to override arrow markers", async () => {
    const svg = await edgeSvg({ direction: "bidirectional", tags: ["async"] });
    expect(svg).toContain(`marker-start="url(#${edgeMarkerPrefix}-marker-diamond)"`);
    expect(svg).toContain(`marker-end="url(#${edgeMarkerPrefix}-marker-open-arrow)"`);
  });

  const lineStyleCases: Array<{ lineStyle: LineStyle; strokeDasharray: string | undefined }> = [
    { lineStyle: "solid", strokeDasharray: undefined },
    { lineStyle: "dashed", strokeDasharray: "8 4" },
    { lineStyle: "dotted", strokeDasharray: "2 4" },
    { lineStyle: "dash-dot", strokeDasharray: "8 4 2 4" },
  ];

  for (const { lineStyle, strokeDasharray } of lineStyleCases) {
    test(`renders ${lineStyle} edge line style preset`, () => {
      const svg = renderLineStyleRule({ lineStyle });
      if (strokeDasharray === undefined) {
        expect(svg).not.toContain("stroke-dasharray");
      } else {
        expect(svg).toContain(`stroke-dasharray="${strokeDasharray}"`);
      }
    });
  }

  test("lets explicit strokeDasharray override lineStyle presets", () => {
    const svg = renderLineStyleRule({ lineStyle: "dashed", strokeDasharray: "1 2 3" });
    expect(svg).toContain('stroke-dasharray="1 2 3"');
    expect(svg).not.toContain('stroke-dasharray="8 4"');
  });

  test("resolves edge-kind lineStyle rules from document styles", () => {
    const doc = document({
      id: "edge-kind-line-style-test",
      kind: "graph",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [{ id: "ab", kind: "calls", sourceId: "a", targetId: "b" }],
      groups: [],
      styles: { rules: { "relationship:calls": { lineStyle: "dotted" } } },
    });
    const svg = renderSvgSync(doc, { positionedDiagram: positionedLineStyleDiagram(doc) });
    expect(svg).toContain('stroke-dasharray="2 4"');
  });

  test("keeps default edge rendering solid when no line style is configured", () => {
    const svg = renderLineStyleRule({});
    expect(svg).not.toContain("stroke-dasharray");
  });

  test("renders node labels without truncating", () => {
    const doc = document({
      id: "truncate-test",
      nodes: [
        {
          id: "service",
          kind: "component",
          label: "Extremely long service label that cannot fit",
        },
      ],
    });
    const positionedDiagram = {
      document: doc,
      nodes: [
        {
          id: "service",
          kind: "component",
          label: "Extremely long service label that cannot fit",
          x: 10,
          y: 10,
          width: 80,
          height: 40,
          labelLines: ["Extremely long service label that cannot fit"],
          contentLayout: {
            icons: [],
            label: { x: 50, y: 30, lines: ["Extremely long service label that cannot fit"] },
          },
        },
      ],
      edges: [],
      groups: [],
      activations: [],
      width: 120,
      height: 80,
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain("Extremely long service label that cannot fit");
    expect(svg).not.toContain("…");
  });

  test("keeps raw node label width available to the SVG output", () => {
    const doc = document({
      id: "node-width-test",
      nodes: [{ id: "node", kind: "component", label: "WWWWWWWWWWWWWWWW" }],
    });
    const positionedDiagram = {
      document: doc,
      nodes: [
        {
          id: "node",
          kind: "component",
          label: "WWWWWWWWWWWWWWWW",
          x: 0,
          y: 0,
          width: 84,
          height: 40,
          labelLines: ["WWWWWWWWWWWWWWWW"],
          contentLayout: { icons: [], label: { x: 42, y: 20, lines: ["WWWWWWWWWWWWWWWW"] } },
        },
      ],
      edges: [],
      groups: [],
      activations: [],
      width: 100,
      height: 60,
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    const widthMatch = svg.match(/data-width="([0-9.]+)"/);
    expect(widthMatch).not.toBeNull();
    expect(Number(widthMatch?.[1])).toBeGreaterThan(84);
    expect(svg).toContain("WWWWWWWWWWWWWWWW");
  });

  test("clips labels when even an ellipsis exceeds the text bounds", () => {
    const doc = document({
      id: "clip-test",
      nodes: [{ id: "tiny", kind: "component", label: "Too long" }],
    });
    const positionedDiagram = {
      document: doc,
      nodes: [
        {
          id: "tiny",
          kind: "component",
          label: "Too long",
          x: 4,
          y: 4,
          width: 8,
          height: 24,
          labelLines: ["Too long"],
          contentLayout: { icons: [], label: { x: 8, y: 16, lines: ["Too long"] } },
        },
      ],
      edges: [],
      groups: [],
      activations: [],
      width: 40,
      height: 40,
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain("<clipPath ");
    expect(svg).toContain('clip-path="url(#');
    expect(svg).toContain('width="8"');
  });

  test("keeps edge labels inside sequence fragment bounds", () => {
    const doc = document({
      id: "fragment-label-test",
      kind: "sequence",
      nodes: [
        { id: "client", kind: "participant", label: "Client" },
        { id: "service", kind: "participant", label: "Service" },
      ],
      edges: [
        {
          id: "inside",
          kind: "message",
          sourceId: "client",
          targetId: "service",
          label: "inside",
        },
      ],
      groups: [{ id: "frag", kind: "loop", childIds: ["inside"], label: "retry" }],
    });
    const positionedDiagram: PositionedDiagram = {
      document: doc,
      nodes: [],
      edges: [
        {
          id: "inside",
          kind: "message",
          sourceId: "client",
          targetId: "service",
          label: "inside",
          waypoints: [
            { x: 220, y: 216 },
            { x: 620, y: 216 },
          ],
          labelPosition: { x: 420, y: 216 },
          labelLines: ["inside"],
        },
      ],
      groups: [
        {
          id: "frag",
          kind: "loop",
          childIds: ["inside"],
          label: "retry",
          x: 176,
          y: 180,
          width: 488,
          height: 224,
          labelLines: ["retry"],
        },
      ],
      activations: [],
      width: 720,
      height: 520,
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    const edgeLabelGroup = svg.match(/<g id="[^"]*label-edge-inside[^"]*"([^>]*)>/);
    expect(edgeLabelGroup?.[1] ?? "").not.toContain("transform");
    expect(svg).toContain('y="208"');
  });

  test("measures narrow and wide text differently", () => {
    expect(measureText("iiii", 10)).toBeLessThan(measureText("mmmm", 10));
    expect(measureText("WWWW", 10)).toBeGreaterThan(measureText("iiii", 10) * 3);
  });

  test("positions edge labels above paths with available width", () => {
    const doc = document({
      id: "edge-label-test",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [{ id: "a-to-b", kind: "calls", sourceId: "a", targetId: "b", label: "calls" }],
    });
    const positionedDiagram = {
      document: doc,
      nodes: [],
      edges: [
        {
          id: "a-to-b",
          kind: "calls",
          sourceId: "a",
          targetId: "b",
          label: "calls",
          waypoints: [
            { x: 20, y: 70 },
            { x: 180, y: 70 },
          ],
          labelPosition: { x: 100, y: 70 },
          labelLines: ["calls"],
        },
      ],
      groups: [],
      activations: [],
      width: 200,
      height: 100,
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain('x="100"');
    expect(svg).toContain('y="62"');
    expect(svg).toContain('data-width="29.4"');
  });

  test("renders groups and sequence fragment lanes", async () => {
    const svg = await sequenceSvg();
    expect(svg).toContain('id="drawspec-checkout-sequence-1nkmrpb-group-payment-alt-0uev8vs"');
    expect(svg).toContain("authorized");
    expect(svg).toContain("declined");
  });

  test("renders sequence activation bars", async () => {
    const svg = await sequenceSvg();
    expect(svg).toContain(
      'id="drawspec-checkout-sequence-1nkmrpb-activation-start-activation-1qkvb8f"'
    );
    expect(svg).toContain('fill="#e0f2fe"');
  });

  test("resolves explicit tag styles before kind and theme defaults", async () => {
    const svg = await architectureSvg();
    expect(svg).toContain('fill="#dbeafe"');
    expect(svg).toContain('stroke="#1d4ed8"');
  });

  test("matches the architecture golden fixture", async () => {
    await expectGolden("architecture", await architectureSvg());
  });

  test("matches the sequence golden fixture", async () => {
    await expectGolden("sequence", await sequenceSvg());
  });

  test("matches the rich text golden fixture", async () => {
    await expectGolden("rich-text", await richTextSvg());
  });

  test("emits data-source-file and data-source-line on nodes with source locations", async () => {
    const doc = document({
      id: "source-loc-test",
      kind: "graph",
      nodes: [
        {
          id: "svc",
          kind: "component",
          label: "Service",
          source: { file: "diagram.ts", line: 42, column: 5 },
        },
      ],
      edges: [],
      groups: [],
    });
    const positionedDiagram = await simpleGraphLayout().layout(doc);
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain('data-source-file="diagram.ts"');
    expect(svg).toContain('data-source-line="42"');
  });

  test("emits data-source attributes on edges with source locations", async () => {
    const doc = document({
      id: "edge-source-test",
      kind: "graph",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "ab",
          kind: "calls",
          sourceId: "a",
          targetId: "b",
          source: { file: "flow.ts", line: 15, column: 3 },
        },
      ],
      groups: [],
    });
    const positionedDiagram = await simpleGraphLayout().layout(doc);
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain('data-source-file="flow.ts"');
    expect(svg).toContain('data-source-line="15"');
  });

  test("emits data-source attributes on groups with source locations", () => {
    const doc = document({
      id: "group-source-test",
      kind: "graph",
      nodes: [],
      edges: [],
      groups: [
        {
          id: "grp",
          kind: "boundary",
          label: "System",
          source: { file: "sys.ts", line: 7, column: 1 },
        },
      ],
    });
    const positionedDiagram = {
      document: doc,
      nodes: [],
      edges: [],
      groups: [
        {
          id: "grp",
          kind: "boundary",
          label: "System",
          childIds: [],
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          labelLines: ["System"],
          source: { file: "sys.ts", line: 7, column: 1 },
        },
      ],
      activations: [],
      width: 200,
      height: 100,
      canvasBounds: { x: 0, y: 0, width: 200, height: 100 },
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain('data-source-file="sys.ts"');
    expect(svg).toContain('data-source-line="7"');
  });

  test("omits data-source attributes when source is absent", async () => {
    const doc = document({
      id: "no-source-test",
      kind: "graph",
      nodes: [{ id: "x", kind: "component", label: "X" }],
      edges: [],
      groups: [],
    });
    const positionedDiagram = await simpleGraphLayout().layout(doc);
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).not.toContain("data-source-file");
    expect(svg).not.toContain("data-source-line");
  });

  describe("edge label rotation", () => {
    test("keeps diagonal edge labels horizontal by default", () => {
      const svg = edgeLabelRotationSvg({
        waypoints: [
          { x: 40, y: 40 },
          { x: 160, y: 160 },
        ],
      });

      expect(edgeLabelRotationTransform(svg)).toBeUndefined();
    });

    test("rotates diagonal edge labels when auto rotation is enabled", () => {
      const svg = edgeLabelRotationSvg({
        edgeRotation: "auto",
        waypoints: [
          { x: 40, y: 40 },
          { x: 160, y: 160 },
        ],
      });

      expect(edgeLabelRotationTransform(svg)).toBe("rotate(45 100 100)");
    });

    test("keeps near-vertical auto-rotated edge labels horizontal for readability", () => {
      const svg = edgeLabelRotationSvg({
        edgeRotation: "auto",
        waypoints: [
          { x: 100, y: 20 },
          { x: 120, y: 220 },
        ],
      });

      expect(edgeLabelRotationTransform(svg)).toBeUndefined();
    });

    test("uses per-edge rotation override before the document default", () => {
      const svg = edgeLabelRotationSvg({
        documentRotation: "auto",
        edgeRotation: "none",
        waypoints: [
          { x: 40, y: 40 },
          { x: 160, y: 160 },
        ],
      });

      expect(edgeLabelRotationTransform(svg)).toBeUndefined();
    });

    test("flips right-to-left diagonal labels to avoid upside-down text", () => {
      const svg = edgeLabelRotationSvg({
        edgeRotation: "auto",
        waypoints: [
          { x: 160, y: 160 },
          { x: 40, y: 40 },
        ],
      });

      expect(edgeLabelRotationTransform(svg)).toBe("rotate(45 100 100)");
    });
  });

  describe("lollipop interface rendering", () => {
    function interfaceDocument(
      interfaceKind: "provides" | "requires" | undefined = undefined
    ): DiagramDocument {
      const edges: DiagramDocument["edges"] = [];
      if (interfaceKind !== undefined) {
        edges.push({
          id: "edge",
          kind: interfaceKind,
          sourceId: "comp",
          targetId: "iface",
          direction: "forward",
        });
      }
      return document({
        id: "lollipop-test",
        kind: "component",
        nodes: [
          { id: "comp", kind: "component", label: "Service" },
          { id: "iface", kind: "interface", label: "IUserRepo" },
        ],
        edges,
      });
    }

    function interfaceDiagram(doc: DiagramDocument): PositionedDiagram {
      return {
        activations: [],
        document: doc,
        edges: [],
        groups: [],
        height: 120,
        nodes: [
          {
            id: "comp",
            kind: "component",
            label: "Service",
            x: 10,
            y: 20,
            width: 100,
            height: 50,
            labelLines: ["Service"],
            contentLayout: { icons: [], label: { x: 60, y: 45, lines: ["Service"] } },
          },
          {
            id: "iface",
            kind: "interface",
            label: "IUserRepo",
            x: 140,
            y: 20,
            width: 80,
            height: 40,
            labelLines: ["IUserRepo"],
            contentLayout: {
              icons: [],
              label: { x: 40, y: 28, lines: ["IUserRepo"] },
            },
          },
        ],
        width: 240,
      };
    }

    test("renders a provided interface as a filled circle (lollipop)", () => {
      const doc = interfaceDocument("provides");
      const svg = renderSvgSync(doc, { positionedDiagram: interfaceDiagram(doc) });
      expect(svg).toContain("<circle ");
      expect(svg).toMatch(/r="8"/);
      expect(svg).toContain("IUserRepo");
    });

    test("renders a required interface as a semicircle arc (socket)", () => {
      const doc = interfaceDocument("requires");
      const svg = renderSvgSync(doc, { positionedDiagram: interfaceDiagram(doc) });
      const nodeGroup = svg.match(/<g id="[^"]*node-iface[^"]*">[\s\S]*?<\/g>/);
      expect(nodeGroup).not.toBeNull();
      const groupContent = nodeGroup?.[0] ?? "";
      expect(groupContent).toContain("<path ");
      expect(groupContent).toMatch(/A 8 8/);
      expect(groupContent).toContain('fill="none"');
    });

    test("socket faces toward the requiring component", () => {
      const doc = interfaceDocument("requires");
      const diagram = interfaceDiagram(doc);
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      const nodeGroup = svg.match(/<g id="[^"]*node-iface[^"]*">[\s\S]*?<\/g>/);
      expect(nodeGroup).not.toBeNull();
      const groupContent = nodeGroup?.[0] ?? "";
      // Source (comp) is at x=10, interface at x=140 → source is to the left → socket opens left
      // Left-facing arc: sweep-flag 0
      expect(groupContent).toMatch(/ d="[^"]*A 8 8 0 0 0/);
    });

    test("socket faces right when requiring component is to the right", () => {
      const doc = interfaceDocument("requires");
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [],
        groups: [],
        height: 120,
        nodes: [
          {
            id: "iface",
            kind: "interface",
            label: "IUserRepo",
            x: 10,
            y: 20,
            width: 80,
            height: 40,
            labelLines: ["IUserRepo"],
            contentLayout: {
              icons: [],
              label: { x: 40, y: 28, lines: ["IUserRepo"] },
            },
          },
          {
            id: "comp",
            kind: "component",
            label: "Service",
            x: 140,
            y: 20,
            width: 100,
            height: 50,
            labelLines: ["Service"],
            contentLayout: { icons: [], label: { x: 190, y: 45, lines: ["Service"] } },
          },
        ],
        width: 260,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      const nodeGroup = svg.match(/<g id="[^"]*node-iface[^"]*">[\s\S]*?<\/g>/);
      expect(nodeGroup).not.toBeNull();
      const groupContent = nodeGroup?.[0] ?? "";
      // Source (comp) is to the right of interface → socket opens right
      // Right-facing arc: sweep-flag 1
      expect(groupContent).toMatch(/ d="[^"]*A 8 8 0 0 1/);
    });

    test("renders an interface without edges as a lollipop (provided by default)", () => {
      const doc = interfaceDocument();
      const svg = renderSvgSync(doc, { positionedDiagram: interfaceDiagram(doc) });
      const nodeGroup = svg.match(/<g id="[^"]*node-iface[^"]*">[\s\S]*?<\/g>/);
      expect(nodeGroup).not.toBeNull();
      expect(nodeGroup?.[0]).toContain("<circle ");
    });

    test("positions interface label below the circle", () => {
      const doc = interfaceDocument("provides");
      const svg = renderSvgSync(doc, { positionedDiagram: interfaceDiagram(doc) });
      const labelMatch = svg.match(/<text[^>]*id="[^"]*label-node-iface[^"]*"[^>]*y="([^"]*)"/);
      expect(labelMatch).not.toBeNull();
      const labelY = Number(labelMatch?.[1]);
      // cy=24, r=8 → circle bottom=32, label must clear it
      expect(labelY).toBeGreaterThan(32);
    });

    test("uses interface kind fill and stroke defaults", () => {
      const doc = interfaceDocument("provides");
      const svg = renderSvgSync(doc, { positionedDiagram: interfaceDiagram(doc) });
      const nodeGroup = svg.match(/<g id="[^"]*node-iface[^"]*">[\s\S]*?<\/g>/);
      expect(nodeGroup).not.toBeNull();
      expect(nodeGroup?.[0]).toContain('stroke="#334155"');
    });

    test("matches the component lollipop golden fixture", async () => {
      const doc = document({
        id: "component-lollipop",
        kind: "component",
        nodes: [
          { id: "comp", kind: "component", label: "AuthService" },
          { id: "iface", kind: "interface", label: "IAuth" },
        ],
        edges: [
          {
            id: "prov",
            kind: "provides",
            sourceId: "comp",
            targetId: "iface",
            direction: "forward",
          },
        ],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [],
        groups: [],
        height: 100,
        nodes: [
          {
            id: "comp",
            kind: "component",
            label: "AuthService",
            x: 10,
            y: 20,
            width: 120,
            height: 50,
            labelLines: ["AuthService"],
            contentLayout: { icons: [], label: { x: 70, y: 45, lines: ["AuthService"] } },
          },
          {
            id: "iface",
            kind: "interface",
            label: "IAuth",
            x: 160,
            y: 25,
            width: 60,
            height: 40,
            labelLines: ["IAuth"],
            contentLayout: { icons: [], label: { x: 190, y: 45, lines: ["IAuth"] } },
          },
        ],
        width: 240,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      await expectGolden("component-lollipop", svg);
    });
  });

  describe("LayoutError on missing geometry", () => {
    function nodeWithoutContentLayout(id: string): PositionedDiagram["nodes"][number] {
      return {
        id,
        kind: "component",
        label: "Test Node",
        x: 10,
        y: 10,
        width: 80,
        height: 40,
        labelLines: [],
      } as PositionedDiagram["nodes"][number];
    }

    function edgeWithoutLabelPosition(id: string): PositionedDiagram["edges"][number] {
      return {
        id,
        kind: "calls",
        sourceId: "a",
        targetId: "b",
        label: "Test Label",
        waypoints: [
          { x: 20, y: 50 },
          { x: 180, y: 50 },
        ],
        labelLines: ["Test Label"],
      } as PositionedDiagram["edges"][number];
    }

    test("renderNode throws LayoutError when contentLayout is missing", () => {
      const doc = document({
        id: "missing-content-layout-test",
        nodes: [{ id: "node1", kind: "component", label: "Node" }],
        edges: [],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [],
        groups: [],
        height: 100,
        nodes: [nodeWithoutContentLayout("node1")],
        width: 200,
      };

      expect(() => renderSvgSync(doc, { positionedDiagram: diagram })).toThrow();
      try {
        renderSvgSync(doc, { positionedDiagram: diagram });
      } catch (e: unknown) {
        expect((e as Error).message).toContain("contentLayout");
        expect((e as Error).message).toContain("node1");
      }
    });

    test("renderEdge throws LayoutError when labelPosition is missing on edge with label", () => {
      const doc = document({
        id: "missing-label-position-test",
        nodes: [
          { id: "a", kind: "component", label: "A" },
          { id: "b", kind: "component", label: "B" },
        ],
        edges: [{ id: "edge1", kind: "calls", sourceId: "a", targetId: "b", label: "label" }],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [edgeWithoutLabelPosition("edge1")],
        groups: [],
        height: 100,
        nodes: [
          {
            id: "a",
            kind: "component",
            label: "A",
            x: 0,
            y: 20,
            width: 60,
            height: 40,
            labelLines: [],
          },
          {
            id: "b",
            kind: "component",
            label: "B",
            x: 140,
            y: 20,
            width: 60,
            height: 40,
            labelLines: [],
          },
        ],
        width: 200,
      };

      expect(() => renderSvgSync(doc, { positionedDiagram: diagram })).toThrow();
      try {
        renderSvgSync(doc, { positionedDiagram: diagram });
      } catch (e: unknown) {
        expect((e as Error).message).toContain("labelPosition");
        expect((e as Error).message).toContain("edge1");
      }
    });

    test("renderEdge does NOT throw when edge has no label even if labelPosition is missing", () => {
      const doc = document({
        id: "no-label-edge-test",
        nodes: [
          { id: "a", kind: "component", label: "A" },
          { id: "b", kind: "component", label: "B" },
        ],
        edges: [{ id: "edge1", kind: "calls", sourceId: "a", targetId: "b" }],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [
          {
            id: "edge1",
            kind: "calls",
            sourceId: "a",
            targetId: "b",
            waypoints: [
              { x: 20, y: 50 },
              { x: 180, y: 50 },
            ],
            labelLines: [],
          } as PositionedDiagram["edges"][number],
        ],
        groups: [],
        height: 100,
        nodes: [
          {
            id: "a",
            kind: "component",
            label: "A",
            x: 0,
            y: 20,
            width: 60,
            height: 40,
            labelLines: [],
            contentLayout: { label: { x: 30, y: 20, lines: ["A"] }, icons: [] },
          },
          {
            id: "b",
            kind: "component",
            label: "B",
            x: 140,
            y: 20,
            width: 60,
            height: 40,
            labelLines: [],
            contentLayout: { label: { x: 30, y: 20, lines: ["B"] }, icons: [] },
          },
        ],
        width: 200,
      };

      expect(() => renderSvgSync(doc, { positionedDiagram: diagram })).not.toThrow();
    });
  });

  describe("node label positioning from contentLayout", () => {
    test("uses contentLayout.label position exactly without centering fallback", () => {
      const doc = document({
        id: "content-layout-label-test",
        nodes: [{ id: "n", kind: "component", label: "MyLabel" }],
        edges: [],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [],
        groups: [],
        height: 100,
        nodes: [
          {
            id: "n",
            kind: "component",
            label: "MyLabel",
            x: 50,
            y: 30,
            width: 100,
            height: 40,
            labelLines: ["MyLabel"],
            contentLayout: {
              icons: [],
              label: { x: 15, y: 22, lines: ["MyLabel"] },
            },
          },
        ],
        width: 200,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      const textMatch = svg.match(
        /<text[^>]*id="[^"]*label-node-n-line0[^"]*"[^>]*x="([^"]*)"[^>]*y="([^"]*)"/
      );
      expect(textMatch).not.toBeNull();
      expect(textMatch?.[1]).toBe(String(50 + 15));
      expect(textMatch?.[2]).toBe(String(30 + 22));
    });

    test("uses contentLayout.label.lines for multi-line labels", () => {
      const doc = document({
        id: "multiline-content-layout-test",
        nodes: [{ id: "n", kind: "component", label: "Line1\nLine2" }],
        edges: [],
      });
      const lineHeight = 14 * 1.3;
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [],
        groups: [],
        height: 100,
        nodes: [
          {
            id: "n",
            kind: "component",
            label: "Line1\nLine2",
            x: 10,
            y: 10,
            width: 100,
            height: 60,
            labelLines: ["Line1", "Line2"],
            contentLayout: {
              icons: [],
              label: { x: 50, y: 20, lines: ["Line1", "Line2"] },
            },
          },
        ],
        width: 200,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      const line1Match = svg.match(/<text[^>]*id="[^"]*label-node-n-line0[^"]*"[^>]*y="([^"]*)"/);
      const line2Match = svg.match(/<text[^>]*id="[^"]*label-node-n-line1[^"]*"[^>]*y="([^"]*)"/);
      expect(line1Match).not.toBeNull();
      expect(line2Match).not.toBeNull();
      expect(Number(line2Match?.[1])).toBeCloseTo(Number(line1Match?.[1]) + lineHeight, 1);
    });

    test("returns no labels when contentLayout.label is undefined", () => {
      const doc = document({
        id: "no-label-content-layout-test",
        nodes: [{ id: "n", kind: "database", label: "DB" }],
        edges: [],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [],
        groups: [],
        height: 100,
        nodes: [
          {
            id: "n",
            kind: "database",
            label: "DB",
            x: 10,
            y: 10,
            width: 80,
            height: 60,
            labelLines: [],
            contentLayout: { icons: [] },
          },
        ],
        width: 200,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      expect(svg).not.toMatch(/label-node-n/);
    });
  });

  describe("edge label positioning from layout", () => {
    test("uses layout-provided labelPosition for edge label placement", () => {
      const doc = document({
        id: "edge-layout-pos-test",
        nodes: [
          { id: "a", kind: "component", label: "A" },
          { id: "b", kind: "component", label: "B" },
        ],
        edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "calls" }],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [
          {
            id: "e1",
            kind: "calls",
            sourceId: "a",
            targetId: "b",
            label: "calls",
            waypoints: [
              { x: 0, y: 50 },
              { x: 200, y: 50 },
            ],
            labelPosition: { x: 77, y: 42 },
            labelLines: ["calls"],
          },
        ],
        groups: [],
        height: 100,
        nodes: [],
        width: 200,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      const textMatch = svg.match(/<text[^>]*id="[^"]*label-edge-e1-line0[^"]*"[^>]*x="([^"]*)"/);
      expect(textMatch).not.toBeNull();
      expect(textMatch?.[1]).toBe("77");
    });

    test("uses layout-provided labelLines for edge label text", () => {
      const doc = document({
        id: "edge-layout-lines-test",
        nodes: [
          { id: "a", kind: "component", label: "A" },
          { id: "b", kind: "component", label: "B" },
        ],
        edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "hello world" }],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [
          {
            id: "e1",
            kind: "calls",
            sourceId: "a",
            targetId: "b",
            label: "hello world",
            waypoints: [
              { x: 0, y: 50 },
              { x: 200, y: 50 },
            ],
            labelPosition: { x: 100, y: 50 },
            labelLines: ["hello", "world"],
          },
        ],
        groups: [],
        height: 100,
        nodes: [],
        width: 200,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      expect(svg).toMatch(/id="[^"]*label-edge-e1-line0[^"]*"/);
      expect(svg).toMatch(/id="[^"]*label-edge-e1-line1[^"]*"/);
    });

    test("renders no labels when labelLines is empty", () => {
      const doc = document({
        id: "edge-empty-lines-test",
        nodes: [
          { id: "a", kind: "component", label: "A" },
          { id: "b", kind: "component", label: "B" },
        ],
        edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b" }],
      });
      const diagram: PositionedDiagram = {
        activations: [],
        document: doc,
        edges: [
          {
            id: "e1",
            kind: "calls",
            sourceId: "a",
            targetId: "b",
            waypoints: [
              { x: 0, y: 50 },
              { x: 200, y: 50 },
            ],
            labelPosition: { x: 100, y: 50 },
            labelLines: [],
          },
        ],
        groups: [],
        height: 100,
        nodes: [],
        width: 200,
      };
      const svg = renderSvgSync(doc, { positionedDiagram: diagram });
      expect(svg).not.toMatch(/label-edge-e1/);
    });
  });
});
