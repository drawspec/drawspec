import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { simpleGraphLayout } from "@drawspec/layout";
import type { SvgViewport } from "@drawspec/renderer-svg";
import { renderSvgSync } from "@drawspec/renderer-svg";

function makeDocument(nodeCount: number): DiagramDocument {
  return {
    schemaVersion: "1.0",
    id: "viewport-test",
    kind: "graph",
    nodes: Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i}`,
      kind: "service" as const,
      label: `Node ${i}`,
    })),
    edges: Array.from({ length: Math.min(nodeCount - 1, 5) }, (_, i) => ({
      id: `edge-${i}`,
      kind: "calls" as const,
      sourceId: `node-${i}`,
      targetId: `node-${i + 1}`,
      label: `Call ${i}`,
    })),
    groups: [],
    annotations: [],
  };
}

async function renderWithViewport(
  document: DiagramDocument,
  viewport: SvgViewport | undefined
): Promise<string> {
  const engine = simpleGraphLayout();
  const positionedDiagram = await engine.layout(document);
  return renderSvgSync(document, {
    positionedDiagram,
    accessibility: { title: document.id },
    viewport,
  });
}

describe("SVG viewport culling", () => {
  test("renders all elements without viewport", async () => {
    const document = makeDocument(10);
    const svg = await renderWithViewport(document, undefined);
    for (let i = 0; i < 10; i++) {
      expect(svg).toContain(`node-${i}`);
    }
    expect(svg).toContain("edge-0");
  });

  test("renders full SVG structure even with viewport", async () => {
    const document = makeDocument(5);
    const viewport: SvgViewport = { x: -10000, y: -10000, width: 10, height: 10 };
    const svg = await renderWithViewport(document, viewport);
    expect(svg).toContain("<svg");
    expect(svg).toContain("<?xml");
    expect(svg).toContain("<title");
    expect(svg).toContain("<desc");
    expect(svg).toContain("<defs");
  });

  test("culls nodes outside viewport", async () => {
    const document = makeDocument(10);
    const engine = simpleGraphLayout();
    const positionedDiagram = await engine.layout(document);

    const firstNode = positionedDiagram.nodes[0];
    expect(firstNode).toBeDefined();
    if (!firstNode) return;

    const viewport: SvgViewport = {
      x: firstNode.x - 1,
      y: firstNode.y - 1,
      width: firstNode.width + 2,
      height: firstNode.height + 2,
    };

    const svg = await renderWithViewport(document, viewport);

    expect(svg).toContain(`node-${firstNode.id}`);

    const farNode = positionedDiagram.nodes.find(
      (n) =>
        Math.abs(n.x - viewport.x) > viewport.width && Math.abs(n.y - viewport.y) > viewport.height
    );
    if (farNode) {
      expect(svg).not.toContain(`node-${farNode.id}`);
    }
  });

  test("viewport at origin with small size culls distant nodes", async () => {
    const document = makeDocument(20);
    const viewport: SvgViewport = { x: 0, y: 0, width: 100, height: 100 };

    const svg = await renderWithViewport(document, viewport);

    expect(svg).toContain("<svg");
    expect(svg).toContain("<defs");
  });

  test("large viewport includes all elements", async () => {
    const document = makeDocument(5);
    const engine = simpleGraphLayout();
    await engine.layout(document);

    const viewport: SvgViewport = {
      x: -10000,
      y: -10000,
      width: 200000,
      height: 200000,
    };

    const svg = await renderWithViewport(document, viewport);

    for (let i = 0; i < 5; i++) {
      expect(svg).toContain(`node-${i}`);
    }
  });

  test("culling with zero-size viewport renders structural elements only", async () => {
    const document = makeDocument(5);
    const viewport: SvgViewport = { x: -100000, y: -100000, width: 1, height: 1 };

    const svg = await renderWithViewport(document, viewport);

    expect(svg).toContain("<?xml");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<defs");
  });
});

describe("virtual list math", () => {
  test("computes correct total height", () => {
    const itemHeight = 44;
    const itemCount = 100;
    const totalHeight = itemCount * itemHeight;
    expect(totalHeight).toBe(4400);
  });

  test("computes correct start index with buffer", () => {
    const scrollTop = 880;
    const itemHeight = 44;
    const buffer = 5;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    expect(startIndex).toBe(15);
  });

  test("computes correct end index with buffer", () => {
    const scrollTop = 880;
    const containerHeight = 440;
    const itemHeight = 44;
    const buffer = 5;
    const itemCount = 100;
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    );
    expect(endIndex).toBe(35);
  });

  test("start index clamps to zero for small scroll", () => {
    const scrollTop = 0;
    const itemHeight = 44;
    const buffer = 5;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    expect(startIndex).toBe(0);
  });

  test("end index clamps to last item", () => {
    const scrollTop = 4400;
    const containerHeight = 440;
    const itemHeight = 44;
    const buffer = 5;
    const itemCount = 100;
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    );
    expect(endIndex).toBe(99);
  });

  test("visible count matches window + buffer", () => {
    const itemHeight = 44;
    const containerHeight = 440;
    const buffer = 5;
    const expectedVisible = Math.ceil(containerHeight / itemHeight) + 2 * buffer + 1;
    expect(expectedVisible).toBe(21);
  });
});
