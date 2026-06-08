import type { DiagramDocument, DiagramEdge, DiagramNode } from "@drawspec/core";
import type { Point, PositionedEdge, PositionedGroup, PositionedNode } from "./types";

/** Returns the center point of a positioned node. */
export function centerOf(node: PositionedNode): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

/** Generates waypoints for a self-loop edge originating from `source`. */
export function computeSelfLoopWaypoints(source: PositionedNode, offset = 0): Point[] {
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

/** @deprecated Use computeSelfLoopWaypoints instead. */
export const selfLoopWaypoints = computeSelfLoopWaypoints;

/** Computes straight-line waypoints between the centers of the edge endpoints. */
export function edgeWaypoints(
  edge: DiagramEdge,
  nodesById: Record<string, PositionedNode>
): Point[] {
  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];
  if (source === undefined || target === undefined) return [];
  if (edge.sourceId === edge.targetId) return selfLoopWaypoints(source);
  return [centerOf(source), centerOf(target)].map((point) => ({
    x: round(point.x),
    y: round(point.y),
  }));
}

/** Computes the bounding box dimensions needed to contain all nodes and edge waypoints. */
export function computeBounds(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  padding: number
): { width: number; height: number } {
  const maxX = Math.max(
    padding,
    ...nodes.map((node) => node.x + node.width),
    ...edges.flatMap((edge) => edge.waypoints.map((point) => point.x))
  );
  const maxY = Math.max(
    padding,
    ...nodes.map((node) => node.y + node.height),
    ...edges.flatMap((edge) => edge.waypoints.map((point) => point.y))
  );
  return { width: round(maxX + padding), height: round(maxY + padding) };
}

export interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Computes the full bounding box including all geometry: nodes, edges, labels, arrowheads. */
export function computeCanvasBounds(
  diagram: { nodes: PositionedNode[]; edges: PositionedEdge[]; groups: PositionedGroup[] },
  padding: number
): CanvasBounds {
  const allX: number[] = [];
  const allY: number[] = [];

  for (const node of diagram.nodes) {
    allX.push(node.x, node.x + node.width);
    allY.push(node.y, node.y + node.height);
  }

  for (const edge of diagram.edges) {
    for (const point of edge.waypoints) {
      allX.push(point.x);
      allY.push(point.y);
    }
    if (edge.labelPosition) {
      allX.push(edge.labelPosition.x);
      allY.push(edge.labelPosition.y);
    }
  }

  for (const group of diagram.groups) {
    allX.push(group.x, group.x + group.width);
    allY.push(group.y, group.y + group.height);
  }

  const minX = allX.length > 0 ? Math.min(...allX) : 0;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) : 0;

  return {
    x: round(minX - padding),
    y: round(minY - padding),
    width: round(maxX - minX + 2 * padding),
    height: round(maxY - minY + 2 * padding),
  };
}

/** Rounds a number to 3 decimal places for deterministic output. */
export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Returns document nodes sorted deterministically by id. */
export function sortedNodes(document: DiagramDocument): DiagramNode[] {
  return [...document.nodes].sort((left, right) => left.id.localeCompare(right.id));
}

/** Returns document edges sorted deterministically by id. */
export function sortedEdges(document: DiagramDocument): DiagramEdge[] {
  return [...document.edges].sort((left, right) => left.id.localeCompare(right.id));
}

/** Returns valid graph edges (non-self-loop, both endpoints present). */
export function validGraphEdges(document: DiagramDocument): DiagramEdge[] {
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  return sortedEdges(document).filter(
    (edge) =>
      edge.sourceId !== edge.targetId && nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId)
  );
}
