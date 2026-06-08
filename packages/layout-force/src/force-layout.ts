import type { DiagramDocument, DiagramEdge } from "@drawspec/core";
import type {
  LabelLine,
  LayoutEngine,
  LayoutOptions,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedNode,
} from "@drawspec/layout";
import {
  centerOf,
  computeBounds,
  edgeWaypoints,
  LayoutCache,
  normalizeLayoutOptions,
  round,
  sizeGraphNodes,
  sortedEdges,
  sortedNodes,
  validGraphEdges,
} from "@drawspec/layout";

/** Configuration for the deterministic force simulation. */
export interface ForceSimulationOptions {
  /** Number of fixed simulation ticks to run. Default: 300. */
  iterations?: number;
  /** Repulsive charge strength between every pair of nodes. Default: 6000. */
  repulsion?: number;
  /** Attractive spring strength applied along graph edges. Default: 0.08. */
  attraction?: number;
  /** Preferred distance between connected node centers. Default: layout rank spacing. */
  distance?: number;
  /** Centering force strength pulling nodes toward the initial canvas center. Default: 0.02. */
  centerStrength?: number;
}

/** Layout options accepted by {@link ForceLayoutEngine}. */
export interface ForceLayoutOptions extends LayoutOptions {
  /** Force-directed simulation options. */
  force?: ForceSimulationOptions;
}

interface SimNode extends PositionedNode {
  vx: number;
  vy: number;
}

const DEFAULT_ITERATIONS = 300;
const DEFAULT_REPULSION = 6000;
const DEFAULT_ATTRACTION = 0.08;
const DEFAULT_CENTER_STRENGTH = 0.02;
const DAMPING = 0.82;
const MIN_DISTANCE = 0.001;

function initialAngle(index: number, total: number): number {
  return total <= 1 ? 0 : (Math.PI * 2 * index) / total - Math.PI / 2;
}

function createInitialNodes(document: DiagramDocument, options: ForceLayoutOptions): SimNode[] {
  const normalized = normalizeLayoutOptions(document, options);
  const sizedNodes = sizeGraphNodes(sortedNodes(document), normalized.sizing);
  const radius =
    (Math.max(normalized.spacing.node, normalized.spacing.rank, 1) *
      Math.max(1, sizedNodes.length)) /
    3;
  const center =
    normalized.padding + radius + Math.max(normalized.nodeSize.width, normalized.nodeSize.height);

  return sizedNodes.map((node, index) => {
    const angle = initialAngle(index, sizedNodes.length);
    return {
      ...node,
      x: center + Math.cos(angle) * radius - node.computedWidth / 2,
      y: center + Math.sin(angle) * radius - node.computedHeight / 2,
      width: node.computedWidth,
      height: node.computedHeight,
      vx: 0,
      vy: 0,
    };
  });
}

function applyRepulsion(nodes: SimNode[], repulsion: number): void {
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      if (left === undefined || right === undefined) continue;

      const leftCenter = centerOf(left);
      const rightCenter = centerOf(right);
      const dx = rightCenter.x - leftCenter.x || (rightIndex - leftIndex) * MIN_DISTANCE;
      const dy = rightCenter.y - leftCenter.y || MIN_DISTANCE;
      const distanceSquared = Math.max(dx * dx + dy * dy, MIN_DISTANCE);
      const distance = Math.sqrt(distanceSquared);
      const force = repulsion / distanceSquared;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      left.vx -= fx;
      left.vy -= fy;
      right.vx += fx;
      right.vy += fy;
    }
  }
}

function applyAttraction(
  edges: DiagramEdge[],
  nodesById: Record<string, SimNode>,
  strength: number,
  preferredDistance: number
): void {
  for (const edge of edges) {
    const source = nodesById[edge.sourceId];
    const target = nodesById[edge.targetId];
    if (source === undefined || target === undefined) continue;

    const sourceCenter = centerOf(source);
    const targetCenter = centerOf(target);
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE);
    const force = (distance - preferredDistance) * strength;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;
    source.vx += fx;
    source.vy += fy;
    target.vx -= fx;
    target.vy -= fy;
  }
}

function applyCentering(nodes: SimNode[], center: Point, strength: number): void {
  for (const node of nodes) {
    const nodeCenter = centerOf(node);
    node.vx += (center.x - nodeCenter.x) * strength;
    node.vy += (center.y - nodeCenter.y) * strength;
  }
}

function tick(nodes: SimNode[]): void {
  for (const node of nodes) {
    node.vx *= DAMPING;
    node.vy *= DAMPING;
    node.x += node.vx;
    node.y += node.vy;
  }
}

function normalizePositions(nodes: SimNode[], padding: number): PositionedNode[] {
  const minX = Math.min(0, ...nodes.map((node) => node.x));
  const minY = Math.min(0, ...nodes.map((node) => node.y));
  return nodes.map(({ vx: _vx, vy: _vy, ...node }) => ({
    ...node,
    x: round(node.x - minX + padding),
    y: round(node.y - minY + padding),
  }));
}

function createForceLayout(
  document: DiagramDocument,
  options: ForceLayoutOptions = {}
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

  const nodes = createInitialNodes(document, options);
  const nodesById: Record<string, SimNode> = {};
  for (const node of nodes) nodesById[node.id] = node;

  const graphEdges = validGraphEdges(document);
  const force = options.force ?? {};
  const iterations = Math.max(0, Math.floor(force.iterations ?? DEFAULT_ITERATIONS));
  const repulsion = force.repulsion ?? DEFAULT_REPULSION;
  const attraction = force.attraction ?? DEFAULT_ATTRACTION;
  const distance = force.distance ?? normalized.spacing.rank;
  const centerStrength = force.centerStrength ?? DEFAULT_CENTER_STRENGTH;
  const initialBounds =
    Math.max(normalized.spacing.node, normalized.spacing.rank, 1) * Math.max(1, nodes.length);
  const center = {
    x: normalized.padding + initialBounds / 2,
    y: normalized.padding + initialBounds / 2,
  };

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    applyRepulsion(nodes, repulsion);
    applyAttraction(graphEdges, nodesById, attraction, distance);
    applyCentering(nodes, center, centerStrength);
    tick(nodes);
  }

  const positionedNodes = normalizePositions(nodes, normalized.padding);
  const positionedById: Record<string, PositionedNode> = {};
  for (const node of positionedNodes) positionedById[node.id] = node;
  const edges: PositionedEdge[] = sortedEdges(document).map((edge) => {
    const waypoints = edgeWaypoints(edge, positionedById);
    const label = edge.label;
    const labelLines: LabelLine[] =
      label === undefined ? [] : typeof label === "string" ? label.split("\n") : [label];
    const firstWaypoint = waypoints[0];
    const labelPosition =
      firstWaypoint !== undefined ? { x: firstWaypoint.x, y: firstWaypoint.y } : { x: 0, y: 0 };
    return { ...edge, waypoints, labelPosition, labelLines };
  });
  const { width, height } = computeBounds(positionedNodes, edges, normalized.padding);
  const canvasBounds = { x: 0, y: 0, width, height };

  return {
    document,
    nodes: positionedNodes,
    edges,
    groups: [],
    activations: [],
    width,
    height,
    canvasBounds,
  };
}

/** Deterministic force-directed graph layout engine. */
export class ForceLayoutEngine implements LayoutEngine {
  /** Stable engine name used by registries and diagnostics. */
  readonly name = "force";
  readonly #cache = new LayoutCache();

  /** Returns true for every non-sequence document. */
  supports(document: DiagramDocument): boolean {
    return document.kind !== "sequence";
  }

  /** Computes a deterministic force-directed layout for a graph document. */
  async layout(
    document: DiagramDocument,
    options: ForceLayoutOptions = {}
  ): Promise<PositionedDiagram> {
    const cached = this.#cache.get(document, options);
    if (cached !== undefined) return cached;
    const positioned = createForceLayout(document, options);
    this.#cache.set(document, options, positioned);
    return positioned;
  }
}

/** Creates a deterministic force-directed layout engine instance. */
export function forceLayout(): ForceLayoutEngine {
  return new ForceLayoutEngine();
}
