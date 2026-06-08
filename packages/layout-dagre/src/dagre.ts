import type { DiagramDocument } from "@drawspec/core";
import type {
  LabelLine,
  LayoutEngine,
  LayoutOptions,
  NormalizedLayoutOptions,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedNode,
  SizedNode,
} from "@drawspec/layout";
import {
  computeCanvasBounds,
  computeSelfLoopWaypoints,
  LayoutCache,
  normalizeLayoutOptions,
  round,
  sizeGraphNodes,
  sortedEdges,
  sortedNodes,
  validGraphEdges,
} from "@drawspec/layout";
import dagre from "dagre";

const DIRECTION_MAP: Record<string, string> = {
  TB: "TB",
  BT: "BT",
  LR: "LR",
  RL: "RL",
};

interface DagreLayoutResult {
  nodeMap: Record<string, { x: number; y: number; width: number; height: number }>;
  edgePointsMap: Record<string, Array<{ x: number; y: number }>>;
}

function buildDagreGraph(
  document: DiagramDocument,
  sizedNodes: SizedNode[],
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

  for (const node of sizedNodes) {
    g.setNode(node.id, {
      width: node.computedWidth,
      height: node.computedHeight,
      label: node.id,
    });
  }

  for (const edge of validGraphEdges(document)) {
    g.setEdge(edge.sourceId, edge.targetId, {}, edge.id);
  }

  dagre.layout(g);

  const nodeMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const node of sizedNodes) {
    const pos = g.node(node.id);
    if (pos !== undefined) {
      nodeMap[node.id] = { x: pos.x, y: pos.y, width: pos.width, height: pos.height };
    }
  }

  const edgePointsMap: Record<string, Array<{ x: number; y: number }>> = {};
  for (const edge of sortedEdges(document)) {
    const pos = g.edge(edge.sourceId, edge.targetId, edge.id);
    if (pos !== undefined) {
      edgePointsMap[edge.id] = pos.points.map((p) => ({ x: p.x, y: p.y }));
    }
  }

  return { nodeMap, edgePointsMap };
}

function positionNodes(
  sizedNodes: SizedNode[],
  normalized: NormalizedLayoutOptions,
  nodePositions: Record<string, { x: number; y: number; width: number; height: number }>
): PositionedNode[] {
  return sizedNodes.map((sizedNode) => {
    const pos = nodePositions[sizedNode.id];
    if (pos === undefined) {
      return {
        ...sizedNode,
        x: normalized.padding,
        y: normalized.padding,
        width: sizedNode.computedWidth,
        height: sizedNode.computedHeight,
      };
    }
    return {
      ...sizedNode,
      x: pos.x - pos.width / 2,
      y: pos.y - pos.height / 2,
      width: pos.width,
      height: pos.height,
    };
  });
}

function computeEdgeWaypoints(
  edge: { id: string; sourceId: string; targetId: string },
  nodesById: Record<string, PositionedNode>,
  edgePoints: Record<string, Array<{ x: number; y: number }>>
): Point[] {
  if (edge.sourceId === edge.targetId) {
    const source = nodesById[edge.sourceId];
    if (source === undefined) return [];
    return computeSelfLoopWaypoints(source);
  }

  const points = edgePoints[edge.id];
  if (points !== undefined && points.length > 0) {
    return points.map((p) => ({ x: round(p.x), y: round(p.y) }));
  }

  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];
  if (source === undefined || target === undefined) return [];
  return [
    { x: source.x + source.width / 2, y: source.y + source.height / 2 },
    { x: target.x + target.width / 2, y: target.y + target.height / 2 },
  ];
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

  const sizedNodes = sizeGraphNodes(sortedNodes(document), normalized.sizing);
  const { nodeMap, edgePointsMap } = buildDagreGraph(document, sizedNodes, normalized);

  const nodes = positionNodes(sizedNodes, normalized, nodeMap);
  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const edges: PositionedEdge[] = sortedEdges(document).map((edge) => {
    const waypoints = computeEdgeWaypoints(edge, nodesById, edgePointsMap);
    const label = edge.label;
    const labelLines: LabelLine[] =
      label === undefined ? [] : typeof label === "string" ? label.split("\n") : [label];
    const firstWaypoint = waypoints[0];
    const labelPosition =
      firstWaypoint !== undefined ? { x: firstWaypoint.x, y: firstWaypoint.y } : { x: 0, y: 0 };
    return { ...edge, waypoints, labelPosition, labelLines };
  });

  const canvasBounds = computeCanvasBounds({ nodes, edges, groups: [] }, normalized.padding);

  return {
    document,
    nodes,
    edges,
    groups: [],
    activations: [],
    width: canvasBounds.width,
    height: canvasBounds.height,
    canvasBounds,
  };
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
