import type { DiagramDocument, DiagramEdge, DiagramNode } from "@drawspec/core";
import { measureTextContent } from "@drawspec/text-measure";
import type {
  LabelLine,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedGroup,
  PositionedNode,
} from "./types";

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

const OVERLAP_FONT_SIZE = 14;
const OVERLAP_LINE_HEIGHT_FACTOR = 1.3;
const OVERLAP_GAP = 2;

interface LayoutLabelRect {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "node" | "edge" | "group";
}

interface LayoutOcclusionRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function labelLineWidth(line: LabelLine): number {
  return measureTextContent(line, OVERLAP_FONT_SIZE);
}

function labelBlockHeight(lines: readonly LabelLine[]): number {
  return lines.length * OVERLAP_FONT_SIZE * OVERLAP_LINE_HEIGHT_FACTOR;
}

function maxLineWidth(lines: readonly LabelLine[]): number {
  return Math.max(0, ...lines.map(labelLineWidth));
}

function collectLabelRects(diagram: PositionedDiagram): LayoutLabelRect[] {
  const rects: LayoutLabelRect[] = [];

  for (const node of diagram.nodes) {
    const label = node.contentLayout?.label;
    if (label === undefined || label.lines.length === 0) continue;
    const w = maxLineWidth(label.lines);
    const h = labelBlockHeight(label.lines);
    rects.push({
      id: `node-${node.id}-label`,
      ownerId: node.id,
      x: node.x + label.x - w / 2,
      y: node.y + label.y - OVERLAP_FONT_SIZE * 0.8,
      width: w,
      height: h,
      kind: "node",
    });
  }

  for (const edge of diagram.edges) {
    if (edge.labelLines.length === 0) continue;
    const w = maxLineWidth(edge.labelLines);
    const h = labelBlockHeight(edge.labelLines);
    rects.push({
      id: `edge-${edge.id}-label`,
      ownerId: edge.id,
      x: edge.labelPosition.x - w / 2,
      y: edge.labelPosition.y - OVERLAP_FONT_SIZE * 0.8,
      width: w,
      height: h,
      kind: "edge",
    });
  }

  for (const group of diagram.groups) {
    if (group.labelLines.length === 0) continue;
    const w = maxLineWidth(group.labelLines);
    const h = labelBlockHeight(group.labelLines);
    const labelX = group.x + 16;
    const labelY = group.y + 4;
    rects.push({
      id: `group-${group.id}-label`,
      ownerId: group.id,
      x: labelX,
      y: labelY,
      width: w,
      height: h,
      kind: "group",
    });
  }

  return rects;
}

function collectOcclusionRects(diagram: PositionedDiagram): LayoutOcclusionRect[] {
  const rects: LayoutOcclusionRect[] = [];

  for (const node of diagram.nodes) {
    rects.push({ id: node.id, x: node.x, y: node.y, width: node.width, height: node.height });
  }

  for (const edge of diagram.edges) {
    if (edge.waypoints.length === 0) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of edge.waypoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    rects.push({ id: edge.id, x: minX, y: minY, width: maxX - minX, height: maxY - minY });
  }

  return rects;
}

function rectsOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
  gap: number
): boolean {
  return (
    left.x < right.x + right.width + gap &&
    left.x + left.width + gap > right.x &&
    left.y < right.y + right.height + gap &&
    left.y + left.height + gap > right.y
  );
}

function findContainingGroup(
  rect: { x: number; y: number; width: number; height: number },
  groups: readonly LayoutOcclusionRect[]
): LayoutOcclusionRect | undefined {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const containing = groups.filter(
    (g) => cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height
  );
  return containing.sort(
    (a, b) => a.width * a.height - b.width * b.height || a.id.localeCompare(b.id)
  )[0];
}

/**
 * Adjust label positions in a PositionedDiagram to avoid overlaps.
 *
 * Operates as a post-layout step. Mutates node `contentLayout.label`,
 * edge `labelPosition`, and group positions in place. Labels are shifted
 * down/right by a 2px gap when they overlap other labels or node/edge
 * occlusion rects. Labels are clamped to their containing group bounds.
 */
export function avoidLabelOverlaps(diagram: PositionedDiagram): void {
  const labelRects = collectLabelRects(diagram);
  if (labelRects.length === 0) return;

  const occlusionRects = collectOcclusionRects(diagram);
  const groupBounds: LayoutOcclusionRect[] = diagram.groups.map((g) => ({
    id: g.id,
    x: g.x,
    y: g.y,
    width: g.width,
    height: g.height,
  }));

  const nodeMap = new Map(diagram.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(diagram.edges.map((e) => [e.id, e]));

  const sorted = [...labelRects].sort((a, b) => a.id.localeCompare(b.id));
  const placed: LayoutLabelRect[] = [];

  for (const label of sorted) {
    if (label.kind === "group") {
      placed.push(label);
      continue;
    }

    let bounds = { x: label.x, y: label.y, width: label.width, height: label.height };
    const containingGroup = findContainingGroup(bounds, groupBounds);
    const origCenterX = label.x + label.width / 2;
    const origCenterY = label.y + label.height / 2;

    for (const prev of placed) {
      if (containingGroup !== undefined && label.kind === "edge" && prev.kind === "group") {
        continue;
      }
      if (!rectsOverlap(bounds, prev, OVERLAP_GAP)) continue;

      const shiftY = prev.y + prev.height - bounds.y + OVERLAP_GAP;
      bounds = { ...bounds, y: bounds.y + shiftY };

      if (rectsOverlap(bounds, prev, OVERLAP_GAP)) {
        const shiftX = prev.x + prev.width - bounds.x + OVERLAP_GAP;
        bounds = { ...bounds, x: bounds.x + shiftX };
      }
    }

    for (const rect of occlusionRects) {
      const centerWasInside =
        origCenterX >= rect.x &&
        origCenterX <= rect.x + rect.width &&
        origCenterY >= rect.y &&
        origCenterY <= rect.y + rect.height;
      if (
        rect.id === label.ownerId ||
        rect.id === containingGroup?.id ||
        centerWasInside ||
        !rectsOverlap(bounds, rect, OVERLAP_GAP)
      ) {
        continue;
      }
      const shiftY = rect.y + rect.height - bounds.y + OVERLAP_GAP;
      bounds = { ...bounds, y: bounds.y + shiftY };

      if (rectsOverlap(bounds, rect, OVERLAP_GAP)) {
        const shiftX = rect.x + rect.width - bounds.x + OVERLAP_GAP;
        bounds = { ...bounds, x: bounds.x + shiftX };
      }
    }

    if (containingGroup !== undefined) {
      const maxX = containingGroup.x + Math.max(0, containingGroup.width - bounds.width);
      const maxY = containingGroup.y + Math.max(0, containingGroup.height - bounds.height);
      bounds = {
        ...bounds,
        x: Math.max(containingGroup.x, Math.min(bounds.x, maxX)),
        y: Math.max(containingGroup.y, Math.min(bounds.y, maxY)),
      };
    }

    placed.push({ ...label, x: bounds.x, y: bounds.y });

    if (label.kind === "node") {
      const node = nodeMap.get(label.ownerId);
      if (node?.contentLayout?.label !== undefined) {
        node.contentLayout.label.x = bounds.x + bounds.width / 2 - node.x;
        node.contentLayout.label.y = bounds.y + OVERLAP_FONT_SIZE * 0.8 - node.y;
      }
    } else if (label.kind === "edge") {
      const edge = edgeMap.get(label.ownerId);
      if (edge !== undefined) {
        edge.labelPosition = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + OVERLAP_FONT_SIZE * 0.8,
        };
      }
    }
  }
}
