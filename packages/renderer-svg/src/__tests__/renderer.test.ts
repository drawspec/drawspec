import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { type PositionedDiagram, sequenceLayout, simpleGraphLayout } from "@drawspec/layout";
import { type LineStyle, renderSvg, renderSvgSync, stableSvgId } from "../index";

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

async function architectureSvg(): Promise<string> {
  const positionedDiagram = await simpleGraphLayout().layout(architectureDoc, { direction: "LR" });
  return renderSvg(architectureDoc, { positionedDiagram });
}

async function sequenceSvg(): Promise<string> {
  const positionedDiagram = await sequenceLayout().layout(sequenceDoc);
  return renderSvg(sequenceDoc, { positionedDiagram });
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

function renderLineStyleRule(rule: Record<string, string | number>): string {
  const doc = lineStyleDocument(rule);
  return renderSvgSync(doc, { positionedDiagram: positionedLineStyleDiagram(doc) });
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

  test("renders node shapes by kind", async () => {
    const svg = await architectureSvg();
    expect(svg).toContain('rx="12"');
    expect(svg).toContain("<circle ");
    expect(svg).toContain("C 392 35.333 512 35.333 512 54");
  });

  test("renders edges as paths with deterministic arrow markers and labels", async () => {
    const svg = await architectureSvg();
    expect(svg).toContain('id="drawspec-architecture-demo-1o08l38-marker-arrow-1r281gn"');
    expect(svg).toContain(
      'marker-end="url(#drawspec-architecture-demo-1o08l38-marker-arrow-1r281gn)"'
    );
    expect(svg).toContain("calls");
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
          source: { file: "sys.ts", line: 7, column: 1 },
        },
      ],
      activations: [],
      width: 200,
      height: 100,
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
});
