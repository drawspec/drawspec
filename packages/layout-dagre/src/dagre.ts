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
import { LayoutCache, normalizeLayoutOptions, sizeGraphNodes } from "@drawspec/layout";
import dagre from "dagre";

const DIRECTION_MAP: Record<string, string> = {
  TB: "TB",
  BT: "BT",
  LR: "LR",
  RL: "RL",
};

function sortedNodes(document: DiagramDocument): DiagramNode[] {
  return [...document.nodes].sort((a, b) => a.id.localeCompare(b.id));
}

function sortedEdges(document: DiagramDocument): DiagramEdge[] {
  return [...document.edges].sort((a, b) => a.id.localeCompare(b.id));
}

interface DagreLayoutResult {
  nodeMap: Record<string, { x: number; y: number; width: number; height: number }>;
  edgePointsMap: Record<string, Array<{ x: number; y: number }>>;
}

function buildDagreGraph(
  document: DiagramDocument,
  normalized: NormalizedLayoutOptions
): DagreLayoutResult {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: DIRECTION_MAP[normalized.direction] ?? "TB",
    nodesep: normalized.spacing.node,
    ranksep: normalized.spacing.rank,
    marginx: normalized.padding,
    marginy: normalized.padding,
    align: "UL",
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes = sortedNodes(document);
  const edges = sortedEdges(document);

  for (const node of nodes) {
    g.setNode(node.id, {
      width: normalized.nodeSize.width,
      height: normalized.nodeSize.height,
      label: node.id,
    });
  }

  for (const edge of edges) {
    if (
      edge.sourceId !== edge.targetId &&
      document.nodes.some((n: DiagramNode) => n.id === edge.sourceId) &&
      document.nodes.some((n: DiagramNode) => n.id === edge.targetId)
    ) {
      g.setEdge(edge.sourceId, edge.targetId, {}, edge.id);
    }
  }

  dagre.layout(g);

  const nodeMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const node of nodes) {
    const pos = g.node(node.id);
    if (pos !== undefined) {
      nodeMap[node.id] = { x: pos.x, y: pos.y, width: pos.width, height: pos.height };
    }
  }

  const edgePointsMap: Record<string, Array<{ x: number; y: number }>> = {};
  for (const edge of edges) {
    const pos = g.edge(edge.sourceId, edge.targetId, edge.id);
    if (pos !== undefined) {
      edgePointsMap[edge.id] = pos.points.map((p) => ({ x: p.x, y: p.y }));
    }
  }

  return { nodeMap, edgePointsMap };
}

function positionNodes(
  document: DiagramDocument,
  normalized: NormalizedLayoutOptions,
  nodePositions: Record<string, { x: number; y: number; width: number; height: number }>
): PositionedNode[] {
  const sizedNodes = sizeGraphNodes(sortedNodes(document), normalized.sizing);
  const sizedMap = new Map(sizedNodes.map((n) => [n.id, n]));
  return sortedNodes(document).map((node) => {
    const sizedNode = sizedMap.get(node.id);
    const pos = nodePositions[node.id];
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
      x: pos.x - pos.width / 2,
      y: pos.y - pos.height / 2,
      width: pos.width,
      height: pos.height,
    };
  });
}

function edgeWaypoints(
  edge: DiagramEdge,
  nodesById: Record<string, PositionedNode>,
  edgePoints: Record<string, Array<{ x: number; y: number }>>
): Point[] {
  if (edge.sourceId === edge.targetId) {
    const source = nodesById[edge.sourceId];
    if (source === undefined) return [];
    const cx = source.x + source.width / 2;
    const cy = source.y + source.height / 2;
    return [
      { x: cx, y: cy },
      { x: source.x + source.width + 28, y: cy },
      { x: source.x + source.width + 28, y: source.y - 28 },
      { x: cx, y: source.y - 28 },
      { x: cx, y: cy },
    ];
  }

  const points = edgePoints[edge.id];
  if (points !== undefined && points.length > 0) {
    return points.map((p) => ({
      x: Math.round(p.x * 1000) / 1000,
      y: Math.round(p.y * 1000) / 1000,
    }));
  }

  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];
  if (source === undefined || target === undefined) return [];
  return [
    { x: source.x + source.width / 2, y: source.y + source.height / 2 },
    { x: target.x + target.width / 2, y: target.y + target.height / 2 },
  ];
}

function computeBounds(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  padding: number
): { width: number; height: number } {
  const allX: number[] = [];
  const allY: number[] = [];

  for (const node of nodes) {
    allX.push(node.x + node.width);
    allY.push(node.y + node.height);
  }

  for (const edge of edges) {
    for (const wp of edge.waypoints) {
      allX.push(wp.x);
      allY.push(wp.y);
    }
  }

  return {
    width: Math.max(padding * 2, ...allX) + padding,
    height: Math.max(padding * 2, ...allY) + padding,
  };
}

function createDagreLayout(
  document: DiagramDocument,
  options: LayoutOptions = {}
): PositionedDiagram {
  const normalized = normalizeLayoutOptions(document, options);

  if (document.nodes.length === 0) {
    const width = normalized.padding * 2;
    const height = normalized.padding * 2;
    return {
      document,
      nodes: [],
      edges: [],
      groups: [],
      activations: [],
      width,
      height,
      canvasBounds: { x: 0, y: 0, width, height },
    };
  }

  const { nodeMap, edgePointsMap } = buildDagreGraph(document, normalized);

  const nodes = positionNodes(document, normalized, nodeMap);
  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const edges: PositionedEdge[] = sortedEdges(document).map((edge) => {
    const waypoints = edgeWaypoints(edge, nodesById, edgePointsMap);
    const label = edge.label;
    const labelLines: LabelLine[] =
      label === undefined ? [] : typeof label === "string" ? label.split("\n") : [label];
    const firstWaypoint = waypoints[0];
    const labelPosition =
      firstWaypoint !== undefined ? { x: firstWaypoint.x, y: firstWaypoint.y } : { x: 0, y: 0 };
    return { ...edge, waypoints, labelPosition, labelLines };
  });

  const { width, height } = computeBounds(nodes, edges, normalized.padding);
  const canvasBounds = { x: 0, y: 0, width, height };

  return { document, nodes, edges, groups: [], activations: [], width, height, canvasBounds };
}

export class DagreLayoutEngine implements LayoutEngine {
  readonly name = "dagre";
  readonly #cache = new LayoutCache();

  supports(document: DiagramDocument): boolean {
    return document.kind !== "sequence";
  }

  async layout(document: DiagramDocument, options: LayoutOptions = {}): Promise<PositionedDiagram> {
    const cached = this.#cache.get(document, options);
    if (cached !== undefined) {
      return cached;
    }

    const positioned = createDagreLayout(document, options);
    this.#cache.set(document, options, positioned);
    return positioned;
  }
}

export function dagreLayout(): DagreLayoutEngine {
  return new DagreLayoutEngine();
}
