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
  const nodeSet = new Set(nodeIds);
  const depth: Record<string, number> = {};
  for (const id of nodeIds) {
    depth[id] = 0;
  }

  const usefulEdges = edges
    .filter(
      (edge) =>
        edge.sourceId !== edge.targetId && nodeSet.has(edge.sourceId) && nodeSet.has(edge.targetId)
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

function groupNodesByDepth(
  nodes: DiagramNode[],
  depths: Record<string, number>
): Map<number, DiagramNode[]> {
  const layers = new Map<number, DiagramNode[]>();
  for (const node of nodes) {
    const rank = depths[node.id] ?? 0;
    layers.set(rank, [...(layers.get(rank) ?? []), node]);
  }

  return new Map([...layers.entries()].sort(([left], [right]) => left - right));
}

function rankIndexes(layers: Map<number, DiagramNode[]>): Record<string, number> {
  const indexes: Record<string, number> = {};
  for (const [, layer] of layers) {
    for (const [index, node] of layer.entries()) {
      indexes[node.id] = index;
    }
  }

  return indexes;
}

function edgeMapKey(sourceRank: number, targetRank: number): string {
  return `${sourceRank}\0${targetRank}`;
}

function connectedEdgesForRanks(
  edgeMap: Map<string, DiagramEdge[]>,
  sourceRank: number,
  targetRank: number
): DiagramEdge[] {
  return edgeMap.get(edgeMapKey(sourceRank, targetRank)) ?? [];
}

function buildConnectedEdgeMap(
  edges: DiagramEdge[],
  depths: Record<string, number>
): Map<string, DiagramEdge[]> {
  const edgeMap = new Map<string, DiagramEdge[]>();
  for (const edge of edges) {
    if (edge.sourceId === edge.targetId) {
      continue;
    }

    const sourceRank = depths[edge.sourceId];
    const targetRank = depths[edge.targetId];
    if (sourceRank === undefined || targetRank === undefined) {
      continue;
    }

    const key = edgeMapKey(sourceRank, targetRank);
    const list = edgeMap.get(key) ?? [];
    list.push(edge);
    edgeMap.set(key, list);
  }

  for (const list of edgeMap.values()) {
    list.sort((left, right) => left.id.localeCompare(right.id));
  }

  return edgeMap;
}

function countLayerCrossings(
  depths: Record<string, number>,
  indexes: Record<string, number>,
  edgeMap: Map<string, DiagramEdge[]>
): number {
  const ranks = [...new Set(Object.values(depths))].sort((left, right) => left - right);
  let crossings = 0;

  for (const rank of ranks) {
    const layerEdges = connectedEdgesForRanks(edgeMap, rank, rank + 1);
    for (let leftIndex = 0; leftIndex < layerEdges.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < layerEdges.length; rightIndex += 1) {
        const left = layerEdges[leftIndex];
        const right = layerEdges[rightIndex];
        if (left === undefined || right === undefined) {
          continue;
        }
        const sourceOrder = (indexes[left.sourceId] ?? 0) - (indexes[right.sourceId] ?? 0);
        const targetOrder = (indexes[left.targetId] ?? 0) - (indexes[right.targetId] ?? 0);
        if (sourceOrder * targetOrder < 0) {
          crossings += 1;
        }
      }
    }
  }

  return crossings;
}

function reorderLayerByBarycenter(
  layer: DiagramNode[],
  edges: DiagramEdge[],
  neighborIndexes: Record<string, number>,
  useSources: boolean
): DiagramNode[] {
  const baryMap = new Map<string, number>();
  for (const node of layer) {
    baryMap.set(node.id, barycenterForNode(node.id, edges, neighborIndexes, useSources));
  }

  const previousIndexes: Record<string, number> = {};
  for (const [index, node] of layer.entries()) {
    previousIndexes[node.id] = index;
  }

  return [...layer].sort((left, right) => {
    const leftCenter = baryMap.get(left.id) ?? Number.POSITIVE_INFINITY;
    const rightCenter = baryMap.get(right.id) ?? Number.POSITIVE_INFINITY;
    if (leftCenter !== rightCenter) {
      return leftCenter - rightCenter;
    }

    const previousOrder = (previousIndexes[left.id] ?? 0) - (previousIndexes[right.id] ?? 0);
    return previousOrder === 0 ? left.id.localeCompare(right.id) : previousOrder;
  });
}

function barycenterForNode(
  nodeId: string,
  edges: DiagramEdge[],
  neighborIndexes: Record<string, number>,
  useSources: boolean
): number {
  const positions = edges
    .filter((edge) => (useSources ? edge.targetId === nodeId : edge.sourceId === nodeId))
    .map((edge) => neighborIndexes[useSources ? edge.sourceId : edge.targetId])
    .filter((index): index is number => index !== undefined)
    .sort((left, right) => left - right);

  if (positions.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return positions.reduce((sum, position) => sum + position, 0) / positions.length;
}

function minimizeCrossings(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  depths: Record<string, number>
): DiagramNode[] {
  let layers = groupNodesByDepth(nodes, depths);
  let bestLayers = layers;
  const edgeMap = buildConnectedEdgeMap(edges, depths);
  let bestCrossings = countLayerCrossings(depths, rankIndexes(layers), edgeMap);
  const ranks = [...layers.keys()].sort((left, right) => left - right);
  const maxIterations = 24;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    for (const rank of ranks.slice(1)) {
      const previous = layers.get(rank - 1) ?? [];
      const current = layers.get(rank) ?? [];
      const reordered = reorderLayerByBarycenter(
        current,
        connectedEdgesForRanks(edgeMap, rank - 1, rank),
        rankIndexes(new Map([[rank - 1, previous]])),
        true
      );
      changed ||= reordered.some((node, index) => node.id !== current[index]?.id);
      layers = new Map(layers).set(rank, reordered);
    }

    for (const rank of ranks.slice(0, -1).reverse()) {
      const next = layers.get(rank + 1) ?? [];
      const current = layers.get(rank) ?? [];
      const reordered = reorderLayerByBarycenter(
        current,
        connectedEdgesForRanks(edgeMap, rank, rank + 1),
        rankIndexes(new Map([[rank + 1, next]])),
        false
      );
      changed ||= reordered.some((node, index) => node.id !== current[index]?.id);
      layers = new Map(layers).set(rank, reordered);
    }

    const previousBest = bestCrossings;
    const crossings = countLayerCrossings(depths, rankIndexes(layers), edgeMap);
    if (crossings < bestCrossings) {
      bestCrossings = crossings;
      bestLayers = layers;
    }

    if (!changed || crossings >= previousBest) {
      break;
    }
  }

  return [...bestLayers.values()].flat();
}

function positionGraphNodes(
  document: DiagramDocument,
  normalized: ReturnType<typeof normalizeLayoutOptions>
): PositionedNode[] {
  const nodes = sortedNodes(document);
  const depths = computeDepths(nodes, sortedEdges(document));
  const orderedNodes = minimizeCrossings(nodes, sortedEdges(document), depths);

  const rowIndexes: Record<string, number> = {};
  for (const node of orderedNodes) {
    const rank = String(depths[node.id] ?? 0);
    rowIndexes[rank] = (rowIndexes[rank] ?? 0) + 1;
  }

  const seenInRank: Record<string, number> = {};
  const isHorizontal = normalized.direction === "LR" || normalized.direction === "RL";
  const positioned = orderedNodes.map((node) => {
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

function routeOffset(edgeIndex: number, edgeCount: number): number {
  return (edgeIndex - (edgeCount - 1) / 2) * 12;
}

function shiftedPoint(point: Point, offset: number, isHorizontal: boolean): Point {
  return isHorizontal ? { x: point.x, y: point.y + offset } : { x: point.x + offset, y: point.y };
}

function parallelEdgeKey(edge: DiagramEdge): string {
  return `${edge.sourceId}\u0000${edge.targetId}`;
}

function parallelEdgeIndexes(
  edges: DiagramEdge[]
): Record<string, { count: number; index: number }> {
  const grouped = new Map<string, DiagramEdge[]>();
  for (const edge of edges) {
    const key = parallelEdgeKey(edge);
    grouped.set(key, [...(grouped.get(key) ?? []), edge]);
  }

  const indexes: Record<string, { count: number; index: number }> = {};
  for (const [, group] of [...grouped.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const sorted = [...group].sort((left, right) => left.id.localeCompare(right.id));
    for (const [index, edge] of sorted.entries()) {
      indexes[edge.id] = { count: sorted.length, index };
    }
  }

  return indexes;
}

function selfLoopWaypoints(source: PositionedNode, offset: number): Point[] {
  const center = centerOf(source);
  const radius = 28 + Math.abs(offset);
  const sideX = source.x + source.width + radius;
  const topY = source.y - radius;
  return [
    { x: source.x + source.width, y: center.y },
    { x: sideX, y: center.y - radius / 2 },
    { x: sideX, y: topY },
    { x: center.x, y: topY },
    { x: source.x, y: center.y - radius / 2 },
    { x: source.x, y: center.y },
  ];
}

function straightWaypoints(
  sourceCenter: Point,
  targetCenter: Point,
  offset: number,
  isHorizontal: boolean
): Point[] {
  return [
    shiftedPoint(sourceCenter, offset, isHorizontal),
    shiftedPoint(targetCenter, offset, isHorizontal),
  ];
}

function orthogonalWaypoints(
  sourceCenter: Point,
  targetCenter: Point,
  offset: number,
  isHorizontal: boolean
): Point[] {
  const source = shiftedPoint(sourceCenter, offset, isHorizontal);
  const target = shiftedPoint(targetCenter, offset, isHorizontal);

  if (isHorizontal) {
    const midX = (source.x + target.x) / 2;
    return [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target];
  }

  const midY = (source.y + target.y) / 2;
  return [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target];
}

function curvedWaypoints(
  sourceCenter: Point,
  targetCenter: Point,
  offset: number,
  isHorizontal: boolean
): Point[] {
  const mid = {
    x: (sourceCenter.x + targetCenter.x) / 2,
    y: (sourceCenter.y + targetCenter.y) / 2,
  };
  if (isHorizontal) {
    mid.y += offset;
  } else {
    mid.x += offset;
  }
  return [
    shiftedPoint(sourceCenter, offset, isHorizontal),
    mid,
    shiftedPoint(targetCenter, offset, isHorizontal),
  ];
}

function edgeWaypoints(
  edge: DiagramEdge,
  nodesById: Record<string, PositionedNode>,
  normalized: ReturnType<typeof normalizeLayoutOptions>,
  parallelIndexes: Record<string, { count: number; index: number }>
): Point[] {
  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];
  if (source === undefined || target === undefined) {
    return [];
  }

  const parallel = parallelIndexes[edge.id] ?? { count: 1, index: 0 };
  const offset = routeOffset(parallel.index, parallel.count);
  const isHorizontal = normalized.direction === "LR" || normalized.direction === "RL";
  const sourceCenter = centerOf(source);
  if (edge.sourceId === edge.targetId) {
    return selfLoopWaypoints(source, offset);
  }

  const targetCenter = centerOf(target);
  return normalized.routing === "orthogonal"
    ? orthogonalWaypoints(sourceCenter, targetCenter, offset, isHorizontal)
    : normalized.routing === "curved"
      ? curvedWaypoints(sourceCenter, targetCenter, offset, isHorizontal)
      : straightWaypoints(sourceCenter, targetCenter, offset, isHorizontal);
}

function createGraphLayout(
  document: DiagramDocument,
  options: LayoutOptions = {}
): PositionedDiagram {
  const normalized = normalizeLayoutOptions(document, options);
  const nodes = positionGraphNodes(document, normalized);
  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const orderedEdges = sortedEdges(document);
  const parallelIndexes = parallelEdgeIndexes(orderedEdges);
  const edges: PositionedEdge[] = orderedEdges.map((edge) => ({
    ...edge,
    waypoints: edgeWaypoints(edge, nodesById, normalized, parallelIndexes),
  }));

  const width = Math.max(0, ...nodes.map((node) => node.x + node.width)) + normalized.padding;
  const height = Math.max(0, ...nodes.map((node) => node.y + node.height)) + normalized.padding;

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
