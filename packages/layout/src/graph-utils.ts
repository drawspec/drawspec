import type { DiagramDocument, DiagramEdge, DiagramNode } from "@drawspec/core";
import type { Point, PositionedEdge, PositionedNode } from "./types";

/** Returns the center point of a positioned node. */
export function centerOf(node: PositionedNode): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

/** Generates waypoints for a self-loop edge originating from `source`. */
export function selfLoopWaypoints(source: PositionedNode): Point[] {
  const center = centerOf(source);
  const offset = 28;
  return [
    center,
    { x: source.x + source.width + offset, y: center.y },
    { x: source.x + source.width + offset, y: source.y - offset },
    { x: center.x, y: source.y - offset },
    center,
  ];
}

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
