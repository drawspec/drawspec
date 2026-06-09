/**
 * NOTE: This package does not currently include a WASM binary.
 *
 * The `WasmLayoutEngine` is a layout adapter that CAN delegate to a WASM
 * module via the `WasmBridge` interface. However, no WASM binary is shipped
 * yet — the engine uses `TypeScriptFallbackBridge` for all layout operations.
 *
 * WASM acceleration is planned: once a WASM graph layout binary is available,
 * pass it as `new WasmLayoutEngine(wasmBridge)` to use it instead of the
 * TypeScript fallback.
 *
 * Performance characteristics of the TypeScript fallback:
 * - Suitable for diagrams up to ~500 nodes
 * - Deterministic layered (Sugiyama-style) layout
 * - No external WASM dependencies
 */

import type { DiagramDocument, DiagramEdge, DiagramNode } from "@drawspec/core";
import type {
  LabelLine,
  LayoutEngine,
  LayoutOptions,
  NormalizedLayoutOptions,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedNode,
} from "@drawspec/layout";
import {
  avoidLabelOverlaps,
  computeCanvasBounds,
  computeSelfLoopWaypoints,
  LayoutCache,
  normalizeLayoutOptions,
  sizeGraphNodes,
} from "@drawspec/layout";
import { TypeScriptFallbackBridge } from "./fallback";
import type { WasmBridge, WasmGraphInput } from "./wasm-bridge";

function sortedNodes(document: DiagramDocument): DiagramNode[] {
  return [...document.nodes].sort((a, b) => a.id.localeCompare(b.id));
}

function sortedEdges(document: DiagramDocument): DiagramEdge[] {
  return [...document.edges].sort((a, b) => a.id.localeCompare(b.id));
}

function buildWasmInput(
  sizedMap: Map<string, { computedWidth: number; computedHeight: number }>,
  document: DiagramDocument,
  normalized: NormalizedLayoutOptions
): WasmGraphInput {
  const nodes = sortedNodes(document).map((n) => {
    const sized = sizedMap.get(n.id);
    return {
      id: n.id,
      width: sized?.computedWidth ?? normalized.nodeSize.width,
      height: sized?.computedHeight ?? normalized.nodeSize.height,
    };
  });
  const edges = sortedEdges(document)
    .filter(
      (e) =>
        e.sourceId !== e.targetId &&
        document.nodes.some((n) => n.id === e.sourceId) &&
        document.nodes.some((n) => n.id === e.targetId)
    )
    .map((e) => ({ id: e.id, sourceId: e.sourceId, targetId: e.targetId }));

  return {
    nodes,
    edges,
    direction: normalized.direction,
    nodeSize: { width: normalized.nodeSize.width, height: normalized.nodeSize.height },
    spacing: { node: normalized.spacing.node, rank: normalized.spacing.rank },
    padding: normalized.padding,
  };
}

function fallbackWaypoints(source: PositionedNode, target: PositionedNode): Point[] {
  return [
    { x: source.x + source.width / 2, y: source.y + source.height / 2 },
    { x: target.x + target.width / 2, y: target.y + target.height / 2 },
  ];
}

function positionEdge(
  edge: DiagramEdge,
  nodesById: Record<string, PositionedNode>,
  wasmEdgeRoutes: Record<string, Array<{ x: number; y: number }>>
): Point[] {
  if (edge.sourceId === edge.targetId) {
    const source = nodesById[edge.sourceId];
    return source ? computeSelfLoopWaypoints(source) : [];
  }

  const route = wasmEdgeRoutes[edge.id];
  if (route !== undefined && route.length > 0) {
    return route.map((p) => ({
      x: Math.round(p.x * 1000) / 1000,
      y: Math.round(p.y * 1000) / 1000,
    }));
  }

  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];
  if (source === undefined || target === undefined) return [];
  return fallbackWaypoints(source, target);
}

async function createWasmLayout(
  document: DiagramDocument,
  bridge: WasmBridge,
  options: LayoutOptions = {}
): Promise<PositionedDiagram> {
  const normalized = normalizeLayoutOptions(document, options);

  if (document.nodes.length === 0) {
    const canvasBounds = computeCanvasBounds(
      { nodes: [], edges: [], groups: [] },
      normalized.padding
    );
    return {
      document,
      nodes: [],
      edges: [],
      groups: [],
      activations: [],
      width: canvasBounds.width,
      height: canvasBounds.height,
      canvasBounds,
    };
  }

  const sizedNodes = sizeGraphNodes(sortedNodes(document), normalized.sizing);
  const sizedMap = new Map(sizedNodes.map((n) => [n.id, n]));

  const input = buildWasmInput(sizedMap, document, normalized);
  const bridgeResult = await bridge.compute(input);

  const wasmPositionsById: Record<string, (typeof bridgeResult.nodes)[number]> = {};
  for (const pos of bridgeResult.nodes) {
    wasmPositionsById[pos.id] = pos;
  }

  const nodes: PositionedNode[] = sortedNodes(document).map((node) => {
    const sizedNode = sizedMap.get(node.id);
    const pos = wasmPositionsById[node.id];
    if (pos === undefined) {
      return {
        ...sizedNode!,
        x: normalized.padding,
        y: normalized.padding,
        width: sizedNode?.computedWidth ?? normalized.nodeSize.width,
        height: sizedNode?.computedHeight ?? normalized.nodeSize.height,
      };
    }
    return {
      ...sizedNode!,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    };
  });

  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const wasmEdgeRoutes: Record<string, Array<{ x: number; y: number }>> = {};
  for (const route of bridgeResult.edges) {
    wasmEdgeRoutes[route.id] = route.waypoints;
  }

  const edges: PositionedEdge[] = sortedEdges(document).map((edge) => {
    const waypoints = positionEdge(edge, nodesById, wasmEdgeRoutes);
    const label = edge.label;
    const labelLines: LabelLine[] =
      label === undefined ? [] : typeof label === "string" ? label.split("\n") : [label];
    const firstWaypoint = waypoints[0];
    const labelPosition =
      firstWaypoint !== undefined ? { x: firstWaypoint.x, y: firstWaypoint.y } : { x: 0, y: 0 };
    return { ...edge, waypoints, labelPosition, labelLines };
  });

  const canvasBounds = computeCanvasBounds({ nodes, edges, groups: [] }, normalized.padding);

  const result: PositionedDiagram = {
    document,
    nodes,
    edges,
    groups: [],
    activations: [],
    width: canvasBounds.width,
    height: canvasBounds.height,
    canvasBounds,
  };
  avoidLabelOverlaps(result);
  return result;
}

export class WasmLayoutEngine implements LayoutEngine {
  readonly name: string;
  readonly #cache = new LayoutCache();
  readonly #bridge: WasmBridge;

  constructor(bridge?: WasmBridge) {
    this.#bridge = bridge ?? new TypeScriptFallbackBridge();
    this.name = `wasm:${this.#bridge.name}`;
  }

  supports(document: DiagramDocument): boolean {
    return document.kind !== "sequence";
  }

  async layout(document: DiagramDocument, options: LayoutOptions = {}): Promise<PositionedDiagram> {
    const cached = this.#cache.get(document, options);
    if (cached !== undefined) {
      return cached;
    }

    const positioned = await createWasmLayout(document, this.#bridge, options);
    this.#cache.set(document, options, positioned);
    return positioned;
  }
}

export function wasmLayout(bridge?: WasmBridge): WasmLayoutEngine {
  return new WasmLayoutEngine(bridge);
}
