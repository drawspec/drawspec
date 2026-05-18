import { LayoutCache } from "./cache";
import { normalizeLayoutOptions } from "./options";
import type {
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  LayoutEngine,
  LayoutOptions,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedNode,
} from "./types";

function centerOf(node: PositionedNode): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function sortedNodes(document: DiagramDocument): DiagramNode[] {
  return [...document.nodes].sort((left, right) => left.id.localeCompare(right.id));
}

function sortedEdges(document: DiagramDocument): DiagramEdge[] {
  return [...document.edges].sort((left, right) => left.id.localeCompare(right.id));
}

function computeDepths(nodes: DiagramNode[], edges: DiagramEdge[]): Record<string, number> {
  const nodeIds = nodes.map((node) => node.id).sort();
  const depth: Record<string, number> = {};
  for (const id of nodeIds) {
    depth[id] = 0;
  }

  const usefulEdges = edges
    .filter(
      (edge) =>
        edge.sourceId !== edge.targetId &&
        nodeIds.includes(edge.sourceId) &&
        nodeIds.includes(edge.targetId)
    )
    .sort((left, right) => left.id.localeCompare(right.id));

  for (let pass = 0; pass < nodeIds.length; pass += 1) {
    let changed = false;
    for (const edge of usefulEdges) {
      const nextDepth = (depth[edge.sourceId] ?? 0) + 1;
      if (nextDepth > (depth[edge.targetId] ?? 0)) {
        depth[edge.targetId] = nextDepth;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }

  for (const id of nodeIds) {
    depth[id] = Math.min(depth[id] ?? 0, nodeIds.length - 1);
  }

  return depth;
}

function positionGraphNodes(document: DiagramDocument, options: LayoutOptions): PositionedNode[] {
  const normalized = normalizeLayoutOptions(document, options);
  const nodes = sortedNodes(document);
  const depths = computeDepths(nodes, sortedEdges(document));

  const rowIndexes: Record<string, number> = {};
  for (const node of nodes) {
    const rank = String(depths[node.id] ?? 0);
    rowIndexes[rank] = (rowIndexes[rank] ?? 0) + 1;
  }

  const seenInRank: Record<string, number> = {};
  const isHorizontal = normalized.direction === "LR" || normalized.direction === "RL";
  const positioned = nodes.map((node) => {
    const rank = depths[node.id] ?? 0;
    const rankKey = String(rank);
    const index = seenInRank[rankKey] ?? 0;
    seenInRank[rankKey] = index + 1;
    const rankOffset =
      normalized.padding + rank * (normalized.nodeSize.height + normalized.spacing.rank);
    const nodeOffset =
      normalized.padding + index * (normalized.nodeSize.width + normalized.spacing.node);

    return {
      ...node,
      x: isHorizontal ? rankOffset : nodeOffset,
      y: isHorizontal ? nodeOffset : rankOffset,
      width: normalized.nodeSize.width,
      height: normalized.nodeSize.height,
    };
  });

  if (normalized.direction === "BT") {
    const maxY = Math.max(0, ...positioned.map((node) => node.y));
    return positioned.map((node) => ({ ...node, y: maxY - node.y + normalized.padding }));
  }

  if (normalized.direction === "RL") {
    const maxX = Math.max(0, ...positioned.map((node) => node.x));
    return positioned.map((node) => ({ ...node, x: maxX - node.x + normalized.padding }));
  }

  return positioned;
}

function edgeWaypoints(edge: DiagramEdge, nodesById: Record<string, PositionedNode>): Point[] {
  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];
  if (source === undefined || target === undefined) {
    return [];
  }

  const sourceCenter = centerOf(source);
  if (edge.sourceId === edge.targetId) {
    const loopX = source.x + source.width + 28;
    const loopY = source.y - 28;
    return [
      sourceCenter,
      { x: loopX, y: sourceCenter.y },
      { x: loopX, y: loopY },
      { x: sourceCenter.x, y: loopY },
      sourceCenter,
    ];
  }

  return [sourceCenter, centerOf(target)];
}

function createGraphLayout(
  document: DiagramDocument,
  options: LayoutOptions = {}
): PositionedDiagram {
  const nodes = positionGraphNodes(document, options);
  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const edges: PositionedEdge[] = sortedEdges(document).map((edge) => ({
    ...edge,
    waypoints: edgeWaypoints(edge, nodesById),
  }));

  const width =
    Math.max(0, ...nodes.map((node) => node.x + node.width)) +
    normalizeLayoutOptions(document, options).padding;
  const height =
    Math.max(0, ...nodes.map((node) => node.y + node.height)) +
    normalizeLayoutOptions(document, options).padding;

  return { document, nodes, edges, groups: [], activations: [], width, height };
}

export class SimpleGraphLayoutEngine implements LayoutEngine {
  readonly name = "simple-graph";
  readonly #cache = new LayoutCache();

  supports(document: DiagramDocument): boolean {
    return document.kind !== "sequence";
  }

  async layout(document: DiagramDocument, options: LayoutOptions = {}): Promise<PositionedDiagram> {
    const cached = this.#cache.get(document, options);
    if (cached !== undefined) {
      return cached;
    }

    const positioned = createGraphLayout(document, options);
    this.#cache.set(document, options, positioned);
    return positioned;
  }
}

export function simpleGraphLayout(): SimpleGraphLayoutEngine {
  return new SimpleGraphLayoutEngine();
}
