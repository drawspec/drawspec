import type { LabelContent, LabelOverflow } from "@drawspec/core";
import { truncateTextContent, wrapTextContent } from "@drawspec/text-measure";
import type { LabelLine, Point, PositionedEdge, TextStyle } from "./types";

const EDGE_LABEL_FALLBACK_WIDTH = 240;
const MARKER_SIZE = 8;
const DEFAULT_FONT_SIZE = 14;

export interface EdgeLabelOptions {
  /** Text style for measurement. Default: fontSize 14. */
  typography?: TextStyle;
  /** Font size shorthand (overrides typography.fontSize). */
  fontSize?: number;
  /** Label overflow behavior. Default: "wrap". */
  labelOverflow?: LabelOverflow;
}

/**
 * Compute label positions and wrapped/truncated text for all edges.
 *
 * For each edge that has a label, computes:
 * - `labelPosition`: the geometric midpoint along the edge's waypoints
 * - `labelLines`: the text lines (wrapped or truncated based on edge length)
 *
 * Edges without labels are left unchanged. Mutates edges in-place.
 */
export function sizeEdgeLabels(edges: PositionedEdge[], options?: EdgeLabelOptions): void {
  const fontSize = options?.fontSize ?? options?.typography?.fontSize ?? DEFAULT_FONT_SIZE;
  const labelOverflow = options?.labelOverflow ?? "wrap";

  for (const edge of edges) {
    if (edge.label === undefined) {
      continue;
    }

    // Compute midpoint from waypoints
    const mid = computeMidpoint(edge.waypoints);

    // Compute max label width from path length
    const maxWidth = computeEdgeLabelMaxWidth(edge.waypoints);

    // Wrap or truncate label text
    const labelLines = computeLabelLines(edge.label, maxWidth, fontSize, labelOverflow);

    // Mutate in-place
    edge.labelPosition = mid;
    edge.labelLines = labelLines;
  }
}

/**
 * Compute the geometric midpoint along a polyline path.
 * For empty/undefined paths returns origin. For single point returns that point.
 */
function computeMidpoint(waypoints: readonly Point[]): Point {
  if (waypoints.length === 0) {
    return { x: 0, y: 0 };
  }
  if (waypoints.length === 1) {
    const first = waypoints[0]!;
    return { x: first.x, y: first.y };
  }

  let totalLength = 0;
  const cumulativeLengths: number[] = [0];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const current = waypoints[i]!;
    const next = waypoints[i + 1]!;
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    cumulativeLengths.push(totalLength);
  }

  if (totalLength === 0) {
    const first = waypoints[0]!;
    return { x: first.x, y: first.y };
  }

  const halfLength = totalLength / 2;
  for (let i = 0; i < cumulativeLengths.length - 1; i++) {
    const segStart = cumulativeLengths[i]!;
    const segEnd = cumulativeLengths[i + 1]!;
    if (halfLength >= segStart && halfLength <= segEnd) {
      const segLength = segEnd - segStart;
      const t = segLength > 0 ? (halfLength - segStart) / segLength : 0;
      const p0 = waypoints[i]!;
      const p1 = waypoints[i + 1]!;
      return { x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) };
    }
  }

  const last = waypoints[waypoints.length - 1]!;
  return { x: last.x, y: last.y };
}

/**
 * Compute the maximum width for an edge label based on path length.
 * Same algorithm as the renderer's edgeLabelMaxWidth function.
 */
function computeEdgeLabelMaxWidth(waypoints: readonly Point[]): number {
  if (waypoints.length < 2) {
    return EDGE_LABEL_FALLBACK_WIDTH;
  }

  let pathLength = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const current = waypoints[i]!;
    const next = waypoints[i + 1]!;
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  const markerSpace = MARKER_SIZE * 2; // both start and end markers
  return Math.max(80, Math.min(300, pathLength - markerSpace));
}

/**
 * Compute label lines from the label content.
 * Handles empty strings, multi-line labels (\n), wrapping, and truncation.
 */
function computeLabelLines(
  label: LabelContent,
  maxWidth: number,
  fontSize: number,
  labelOverflow: LabelOverflow
): LabelLine[] {
  // Empty string label produces empty lines
  if (typeof label === "string" && label === "") {
    return [];
  }

  if (labelOverflow === "truncate") {
    if (typeof label === "string") {
      const hardLines = label.split("\n");
      return hardLines.map((line) => truncateTextContent(line, maxWidth, fontSize));
    }
    // Rich text: truncateTextContent handles RichText directly
    return [truncateTextContent(label, maxWidth, fontSize)];
  }

  return wrapTextContent(label, maxWidth, fontSize);
}
