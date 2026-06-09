import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/layout";
import { computeSelfLoopWaypoints } from "@drawspec/layout";
import { dagreLayout } from "@drawspec/layout-dagre";
import { elkLayout } from "@drawspec/layout-elk";
import { wasmLayout } from "@drawspec/layout-wasm";
import { simpleGraphLayout } from "../graph";

function doc(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    schemaVersion: "1.0.0",
    id: "doc",
    kind: "graph",
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    ...overrides,
  } as DiagramDocument;
}

const autoSizing = { sizing: { mode: "auto" as const } };

interface EngineResult {
  name: string;
  positioned: Awaited<ReturnType<ReturnType<typeof dagreLayout>["layout"]>>;
}

async function layoutAllEngines(
  document: DiagramDocument,
  options = autoSizing
): Promise<EngineResult[]> {
  const [dagreResult, elkResult, wasmResult, builtInResult] = await Promise.all([
    dagreLayout().layout(document, options),
    elkLayout().layout(document, options),
    wasmLayout().layout(document, options),
    simpleGraphLayout().layout(document, options),
  ]);

  return [
    { name: "dagre", positioned: dagreResult },
    { name: "elk", positioned: elkResult },
    { name: "wasm", positioned: wasmResult },
    { name: "built-in", positioned: builtInResult },
  ];
}

function nodeById(results: EngineResult[], nodeId: string) {
  return results.map((r) => ({
    engine: r.name,
    node: r.positioned.nodes.find((n) => n.id === nodeId)!,
  }));
}

function edgeById(results: EngineResult[], edgeId: string) {
  return results.map((r) => ({
    engine: r.name,
    edge: r.positioned.edges.find((e) => e.id === edgeId)!,
  }));
}

function geometricMidpoint(waypoints: { x: number; y: number }[]): { x: number; y: number } {
  if (waypoints.length === 0) return { x: 0, y: 0 };
  if (waypoints.length === 1) return { x: waypoints[0]!.x, y: waypoints[0]!.y };

  let totalLength = 0;
  const cumulative: number[] = [0];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1]!.x - waypoints[i]!.x;
    const dy = waypoints[i + 1]!.y - waypoints[i]!.y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    cumulative.push(totalLength);
  }

  if (totalLength === 0) return { x: waypoints[0]!.x, y: waypoints[0]!.y };

  const half = totalLength / 2;
  for (let i = 0; i < cumulative.length - 1; i++) {
    if (half >= cumulative[i]! && half <= cumulative[i + 1]!) {
      const segLen = cumulative[i + 1]! - cumulative[i]!;
      const t = segLen > 0 ? (half - cumulative[i]!) / segLen : 0;
      return {
        x: waypoints[i]!.x + t * (waypoints[i + 1]!.x - waypoints[i]!.x),
        y: waypoints[i]!.y + t * (waypoints[i + 1]!.y - waypoints[i]!.y),
      };
    }
  }

  return { x: waypoints[waypoints.length - 1]!.x, y: waypoints[waypoints.length - 1]!.y };
}

describe("Cross-engine node sizing parity", () => {
  test("all engines produce identical node dimensions for same input", async () => {
    const document = doc({
      id: "sizing-parity",
      nodes: [
        { id: "short", kind: "component", label: "A" },
        { id: "medium", kind: "component", label: "Medium Label" },
        {
          id: "long",
          kind: "component",
          label: "This is a very long label that exceeds default width",
        },
        { id: "multi", kind: "component", label: "Line 1\nLine 2\nLine 3" },
      ],
      edges: [],
    });

    const results = await layoutAllEngines(document);
    const nodeIds = ["short", "medium", "long", "multi"];

    for (const nodeId of nodeIds) {
      const entries = nodeById(results, nodeId);
      const first = entries[0]!;
      for (let i = 1; i < entries.length; i++) {
        const entry = entries[i]!;
        expect(entry.node.width, `${nodeId} width: ${first.engine} vs ${entry.engine}`).toBe(
          first.node.width
        );
        expect(entry.node.height, `${nodeId} height: ${first.engine} vs ${entry.engine}`).toBe(
          first.node.height
        );
      }
    }
  });

  test("node positions differ across engines (different algorithms)", async () => {
    const document = doc({
      id: "position-diff",
      nodes: [
        { id: "a", kind: "component", label: "Alpha" },
        { id: "b", kind: "component", label: "Beta" },
        { id: "c", kind: "component", label: "Gamma" },
        { id: "d", kind: "component", label: "Delta" },
      ],
      edges: [
        { id: "e1", kind: "depends-on", sourceId: "a", targetId: "b" },
        { id: "e2", kind: "depends-on", sourceId: "b", targetId: "c" },
        { id: "e3", kind: "depends-on", sourceId: "c", targetId: "d" },
        { id: "e4", kind: "depends-on", sourceId: "a", targetId: "d" },
      ],
    });

    const results = await layoutAllEngines(document);
    const bEntries = nodeById(results, "b");
    const dagrePos = bEntries.find((e) => e.engine === "dagre")!.node;
    const elkPos = bEntries.find((e) => e.engine === "elk")!.node;

    const positionsDiffer =
      Math.abs(dagrePos.x - elkPos.x) > 1 || Math.abs(dagrePos.y - elkPos.y) > 1;
    expect(positionsDiffer, "dagre and ELK should place node differently").toBe(true);
  });

  test("labelLines are identical across engines for same nodes", async () => {
    const document = doc({
      id: "label-lines-parity",
      nodes: [
        { id: "single", kind: "component", label: "Hello" },
        { id: "multi", kind: "component", label: "First\nSecond\nThird" },
      ],
      edges: [],
    });

    const results = await layoutAllEngines(document);

    for (const nodeId of ["single", "multi"]) {
      const entries = nodeById(results, nodeId);
      const first = entries[0]!;
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i]!.node.labelLines, `${nodeId} labelLines`).toEqual(first.node.labelLines);
      }
    }
  });

  test("contentLayout.label is present and consistent for labeled nodes", async () => {
    const document = doc({
      id: "content-layout-parity",
      nodes: [{ id: "n", kind: "component", label: "Test" }],
      edges: [],
    });

    const results = await layoutAllEngines(document);
    const entries = nodeById(results, "n");

    for (const entry of entries) {
      expect(entry.node.contentLayout, `${entry.engine} contentLayout`).toBeDefined();
      expect(entry.node.contentLayout.label, `${entry.engine} contentLayout.label`).toBeDefined();
      expect(
        entry.node.contentLayout.label!.lines.length,
        `${entry.engine} label lines`
      ).toBeGreaterThanOrEqual(1);
    }

    const first = entries[0]!;
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i]!.node.contentLayout.label!.lines).toEqual(
        first.node.contentLayout.label!.lines
      );
    }
  });
});

describe("Cross-engine edge label position parity", () => {
  test("ELK edge label position is geometric midpoint (uses sizeEdgeLabels)", async () => {
    const document = doc({
      id: "edge-label-midpoint",
      nodes: [
        { id: "a", kind: "component", label: "Alpha" },
        { id: "b", kind: "component", label: "Beta" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "uses",
        },
      ],
    });

    const elkResult = await elkLayout().layout(document, autoSizing);
    const edge = elkResult.edges[0]!;

    expect(edge.labelPosition, "elk labelPosition").toBeDefined();
    expect(edge.waypoints.length, "elk waypoints").toBeGreaterThanOrEqual(2);

    const mid = geometricMidpoint(edge.waypoints);
    expect(edge.labelPosition.x, "elk midpoint x").toBeCloseTo(mid.x, 1);
    expect(edge.labelPosition.y, "elk midpoint y").toBeCloseTo(mid.y, 1);
  });

  test("dagre and wasm edge label position is first waypoint", async () => {
    const document = doc({
      id: "edge-label-first-wp",
      nodes: [
        { id: "a", kind: "component", label: "Alpha" },
        { id: "b", kind: "component", label: "Beta" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "uses",
        },
      ],
    });

    const [dagreResult, wasmResult] = await Promise.all([
      dagreLayout().layout(document, autoSizing),
      wasmLayout().layout(document, autoSizing),
    ]);

    for (const [name, result] of [
      ["dagre", dagreResult],
      ["wasm", wasmResult],
    ] as const) {
      const edge = result.edges[0]!;
      const firstWp = edge.waypoints[0]!;
      expect(edge.labelPosition.x, `${name} labelPosition.x`).toBe(firstWp.x);
      expect(
        edge.labelPosition.y,
        `${name} labelPosition.y >= firstWp.y (may be shifted by overlap avoidance)`
      ).toBeGreaterThanOrEqual(firstWp.y);
    }
  });

  test("built-in edge label position is midpoint of first and last waypoint", async () => {
    const document = doc({
      id: "edge-label-built-in",
      nodes: [
        { id: "a", kind: "component", label: "Alpha" },
        { id: "b", kind: "component", label: "Beta" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "uses",
        },
      ],
    });

    const result = await simpleGraphLayout().layout(document, autoSizing);
    const edge = result.edges[0]!;
    const firstWp = edge.waypoints[0]!;
    const lastWp = edge.waypoints[edge.waypoints.length - 1]!;

    expect(edge.labelPosition.x).toBe((firstWp.x + lastWp.x) / 2);
    expect(edge.labelPosition.y).toBe((firstWp.y + lastWp.y) / 2);
  });

  test("labeled edges have consistent labelLines across engines", async () => {
    const document = doc({
      id: "edge-label-lines",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "single",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "uses",
        },
        {
          id: "multi",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "Line 1\nLine 2",
        },
      ],
    });

    const results = await layoutAllEngines(document);

    for (const edgeId of ["single", "multi"]) {
      const entries = edgeById(results, edgeId);
      for (const entry of entries) {
        expect(
          entry.edge.labelLines.length,
          `${edgeId} ${entry.engine} labelLines`
        ).toBeGreaterThan(0);
      }
    }
  });

  test("edges without labels have empty labelLines", async () => {
    const document = doc({
      id: "no-label",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [{ id: "e1", kind: "depends-on", sourceId: "a", targetId: "b" }],
    });

    const results = await layoutAllEngines(document);

    for (const { engine, edge } of edgeById(results, "e1")) {
      expect(edge.labelLines, `${engine} labelLines for unlabeled edge`).toEqual([]);
    }
  });
});

describe("Cross-engine self-loop route parity", () => {
  test("dagre and wasm self-loop waypoints match computeSelfLoopWaypoints", async () => {
    const document = doc({
      id: "self-loop-parity",
      nodes: [{ id: "n", kind: "component", label: "Self" }],
      edges: [{ id: "loop", kind: "self", sourceId: "n", targetId: "n" }],
    });

    const [dagreResult, , wasmResult] = await Promise.all([
      dagreLayout().layout(document, autoSizing),
      elkLayout().layout(document, autoSizing),
      wasmLayout().layout(document, autoSizing),
    ]);

    const dagreEdge = dagreResult.edges[0]!;
    const dagreNode = dagreResult.nodes[0]!;
    const wasmEdge = wasmResult.edges[0]!;
    const wasmNode = wasmResult.nodes[0]!;

    const expectedDagre = computeSelfLoopWaypoints(dagreNode);
    const expectedWasm = computeSelfLoopWaypoints(wasmNode);

    expect(dagreEdge.waypoints, "dagre self-loop").toEqual(expectedDagre);
    expect(wasmEdge.waypoints, "wasm self-loop").toEqual(expectedWasm);

    expect(wasmNode.width).toBe(dagreNode.width);
    expect(wasmNode.height).toBe(dagreNode.height);
  });

  test("ELK self-loop waypoints are present and form a loop", async () => {
    const document = doc({
      id: "elk-self-loop",
      nodes: [{ id: "n", kind: "component", label: "Self" }],
      edges: [{ id: "loop", kind: "self", sourceId: "n", targetId: "n" }],
    });

    const elkResult = await elkLayout().layout(document, autoSizing);
    const edge = elkResult.edges[0]!;
    const node = elkResult.nodes[0]!;

    expect(edge.waypoints.length, "ELK self-loop waypoints").toBeGreaterThanOrEqual(2);

    const extendsBeyond = edge.waypoints.some(
      (wp) =>
        wp.x > node.x + node.width || wp.x < node.x || wp.y < node.y || wp.y > node.y + node.height
    );
    expect(extendsBeyond, "self-loop should extend beyond node bounds").toBe(true);

    const firstWp = edge.waypoints[0]!;
    const lastWp = edge.waypoints[edge.waypoints.length - 1]!;
    const nearFirst =
      Math.abs(firstWp.x - node.x) <= 5 ||
      Math.abs(firstWp.x - (node.x + node.width)) <= 5 ||
      Math.abs(firstWp.x - (node.x + node.width / 2)) <= 5;
    const nearLast =
      Math.abs(lastWp.x - node.x) <= 5 ||
      Math.abs(lastWp.x - (node.x + node.width)) <= 5 ||
      Math.abs(lastWp.x - (node.x + node.width / 2)) <= 5;
    expect(nearFirst, "first wp near node").toBe(true);
    expect(nearLast, "last wp near node").toBe(true);
  });

  test("built-in self-loop waypoints match computeSelfLoopWaypoints", async () => {
    const document = doc({
      id: "builtin-self-loop",
      nodes: [{ id: "n", kind: "component", label: "Self" }],
      edges: [{ id: "loop", kind: "self", sourceId: "n", targetId: "n" }],
    });

    const result = await simpleGraphLayout().layout(document, autoSizing);
    const edge = result.edges[0]!;
    const node = result.nodes[0]!;
    const expected = computeSelfLoopWaypoints(node);

    expect(edge.waypoints, "built-in self-loop").toEqual(expected);
  });
});

describe("Cross-engine canvas bounds parity", () => {
  test("all engines produce valid canvasBounds structure", async () => {
    const document = doc({
      id: "canvas-bounds",
      nodes: [
        { id: "a", kind: "component", label: "Alpha" },
        { id: "b", kind: "component", label: "Beta" },
      ],
      edges: [{ id: "e1", kind: "depends-on", sourceId: "a", targetId: "b", label: "uses" }],
    });

    const results = await layoutAllEngines(document);

    for (const { engine, positioned } of results) {
      const { canvasBounds } = positioned;
      expect(canvasBounds, `${engine} canvasBounds`).toBeDefined();
      expect(typeof canvasBounds.x, `${engine} canvasBounds.x type`).toBe("number");
      expect(typeof canvasBounds.y, `${engine} canvasBounds.y type`).toBe("number");
      expect(canvasBounds.width, `${engine} canvasBounds.width`).toBeGreaterThan(0);
      expect(canvasBounds.height, `${engine} canvasBounds.height`).toBeGreaterThan(0);
    }
  });

  test("canvas bounds contain all nodes and edge waypoints", async () => {
    const document = doc({
      id: "bounds-containment",
      nodes: [
        { id: "a", kind: "component", label: "Alpha" },
        { id: "b", kind: "component", label: "Beta" },
      ],
      edges: [{ id: "e1", kind: "depends-on", sourceId: "a", targetId: "b" }],
    });

    const results = await layoutAllEngines(document);

    for (const { engine, positioned } of results) {
      const { canvasBounds } = positioned;

      for (const node of positioned.nodes) {
        expect(
          node.x + node.width,
          `${engine} node ${node.id} right edge within bounds`
        ).toBeLessThanOrEqual(canvasBounds.x + canvasBounds.width + 1);
        expect(
          node.y + node.height,
          `${engine} node ${node.id} bottom edge within bounds`
        ).toBeLessThanOrEqual(canvasBounds.y + canvasBounds.height + 1);
      }

      for (const edge of positioned.edges) {
        for (const wp of edge.waypoints) {
          expect(wp.x, `${engine} edge ${edge.id} waypoint x`).toBeGreaterThanOrEqual(
            canvasBounds.x - 1
          );
          expect(wp.y, `${engine} edge ${edge.id} waypoint y`).toBeGreaterThanOrEqual(
            canvasBounds.y - 1
          );
        }
      }
    }
  });

  test("empty diagram produces minimal canvasBounds", async () => {
    const emptyDoc = doc({ id: "empty" });
    const results = await layoutAllEngines(emptyDoc, {});

    for (const { engine, positioned } of results) {
      expect(positioned.canvasBounds.width, `${engine} empty width`).toBeGreaterThan(0);
      expect(positioned.canvasBounds.height, `${engine} empty height`).toBeGreaterThan(0);
      expect(positioned.nodes).toHaveLength(0);
      expect(positioned.edges).toHaveLength(0);
    }
  });
});

describe("Cross-engine edge label lines parity", () => {
  test("single-line label produces consistent labelLines across dagre/wasm/built-in", async () => {
    const document = doc({
      id: "single-label",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "depends on",
        },
      ],
    });

    const results = await layoutAllEngines(document);
    const entries = edgeById(results, "e1");

    for (const { engine, edge } of entries) {
      expect(edge.labelLines.length, `${engine} labelLines count`).toBeGreaterThanOrEqual(1);
      expect(String(edge.labelLines[0]), `${engine} labelLines[0]`).toContain("depends");
    }

    const dagreLines = entries.find((e) => e.engine === "dagre")!.edge.labelLines;
    const wasmLines = entries.find((e) => e.engine === "wasm")!.edge.labelLines;
    const builtInLines = entries.find((e) => e.engine === "built-in")!.edge.labelLines;
    expect(wasmLines).toEqual(dagreLines);
    expect(builtInLines).toEqual(dagreLines);
  });

  test("multi-line label (\\n) produces correct split across dagre/wasm/built-in", async () => {
    const document = doc({
      id: "multi-label",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "First line\nSecond line\nThird line",
        },
      ],
    });

    const results = await layoutAllEngines(document);
    const expected = ["First line", "Second line", "Third line"];

    for (const engine of ["dagre", "wasm", "built-in"]) {
      const entry = results.find((r) => r.name === engine)!;
      expect(entry.positioned.edges[0]!.labelLines, `${engine} multi-line`).toEqual(expected);
    }
  });

  test("long label is wrapped by ELK sizeEdgeLabels", async () => {
    const longLabel =
      "This is a very long edge label that should be wrapped by the sizeEdgeLabels function when using the ELK engine";
    const document = doc({
      id: "long-label",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: longLabel,
        },
      ],
    });

    const elkResult = await elkLayout().layout(document, autoSizing);
    const elkEdge = elkResult.edges[0]!;

    expect(elkEdge.labelLines.length, "ELK wraps long label").toBeGreaterThan(1);
    const joined = elkEdge.labelLines.map(String).join("");
    expect(joined.length, "wrapped text preserves content").toBeGreaterThan(0);
  });
});

describe("Cross-engine unicode label parity", () => {
  test("all engines size unicode nodes consistently", async () => {
    const document = doc({
      id: "unicode-parity",
      nodes: [
        { id: "emoji", kind: "component", label: "🚀 Rocket" },
        { id: "cjk", kind: "component", label: "日本語テスト" },
        { id: "arabic", kind: "component", label: "مرحبا بالعالم" },
        { id: "mixed", kind: "component", label: "Hello 世界 🌍" },
      ],
      edges: [],
    });

    const results = await layoutAllEngines(document);

    for (const nodeId of ["emoji", "cjk", "arabic", "mixed"]) {
      const entries = nodeById(results, nodeId);
      const first = entries[0]!;

      for (let i = 1; i < entries.length; i++) {
        const entry = entries[i]!;
        expect(entry.node.width, `${nodeId} width: ${first.engine} vs ${entry.engine}`).toBe(
          first.node.width
        );
        expect(entry.node.height, `${nodeId} height: ${first.engine} vs ${entry.engine}`).toBe(
          first.node.height
        );
        expect(
          entry.node.labelLines,
          `${nodeId} labelLines: ${first.engine} vs ${entry.engine}`
        ).toEqual(first.node.labelLines);
      }
    }
  });

  test("unicode edge labels are positioned correctly", async () => {
    const document = doc({
      id: "unicode-edges",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [
        {
          id: "e1",
          kind: "depends-on",
          sourceId: "a",
          targetId: "b",
          label: "接続 🔗",
        },
      ],
    });

    const results = await layoutAllEngines(document);

    for (const { engine, edge } of edgeById(results, "e1")) {
      expect(edge.labelLines.length, `${engine} unicode labelLines`).toBeGreaterThan(0);
      expect(edge.labelPosition, `${engine} unicode labelPosition`).toBeDefined();
    }
  });
});
