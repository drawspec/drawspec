import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { sequenceLayout, simpleGraphLayout } from "@drawspec/layout";
import { measureText, renderSvg, renderSvgSync, stableSvgId } from "../index";

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

  test("truncates long node labels with an ellipsis", () => {
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
        },
      ],
      edges: [],
      groups: [],
      activations: [],
      width: 120,
      height: 80,
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain("…");
    expect(svg).not.toContain("Extremely long service label that cannot fit");
  });

  test("keeps measured node text width within the node width", () => {
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
    expect(Number(widthMatch?.[1])).toBeLessThanOrEqual(84);
  });

  test("clips labels when even an ellipsis exceeds the text bounds", () => {
    const doc = document({
      id: "clip-test",
      nodes: [{ id: "tiny", kind: "component", label: "Too long" }],
    });
    const positionedDiagram = {
      document: doc,
      nodes: [
        { id: "tiny", kind: "component", label: "Too long", x: 4, y: 4, width: 8, height: 24 },
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

  test("shifts overlapping labels apart deterministically", () => {
    const doc = document({
      id: "overlap-test",
      nodes: [
        { id: "a", kind: "component", label: "Same" },
        { id: "b", kind: "component", label: "Same" },
      ],
    });
    const positionedDiagram = {
      document: doc,
      nodes: [
        { id: "a", kind: "component", label: "Same", x: 10, y: 10, width: 90, height: 40 },
        { id: "b", kind: "component", label: "Same", x: 10, y: 10, width: 90, height: 40 },
      ],
      edges: [],
      groups: [],
      activations: [],
      width: 120,
      height: 80,
    };
    const svg = renderSvgSync(doc, { positionedDiagram });
    expect(svg).toContain('transform="translate(0 16)"');
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
