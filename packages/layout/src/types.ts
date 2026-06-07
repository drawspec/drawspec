import type { DiagramDocument, DiagramEdge, DiagramGroup, DiagramNode } from "@drawspec/core";
import type { TextMeasurer } from "@drawspec/text-measure";
import type { NormalizedNodeSizingOptions } from "./sizing";

export type { DiagramDocument, DiagramEdge, DiagramGroup, DiagramNode, TextMeasurer };

/** Direction in which graph ranks progress. */
export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

/** Edge routing strategy for graph layouts. */
export type LayoutRouting = "straight" | "orthogonal" | "curved";

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface LayoutSpacing {
  node: number;
  rank: number;
  message: number;
  lifeline: number;
}

/** Text style for label measurement. */
export interface TextStyle {
  /** Font size in pixels. */
  fontSize?: number;
  /** CSS font-family value. */
  fontFamily?: string;
}

/** Node sizing configuration at the layout level. */
export interface NodeSizingOptions {
  /** Sizing mode. "auto" measures labels, "fixed" uses defaultSize. Default: "auto". */
  mode?: "auto" | "fixed";
  /** Base size when mode is "fixed", or minimum size for "auto". Default: 120×56. */
  defaultSize?: Partial<Size>;
  /** Minimum node size. Default: 60×40. */
  minSize?: Partial<Size>;
  /** Maximum node size. Nodes exceeding this get truncation. Default: unbounded. */
  maxSize?: Partial<Size>;
  /** Padding around label text. Default: { x: 16, y: 10 }. */
  padding?: { x: number; y: number };
  /** Global label wrapping. Default: "none". */
  labelWrap?: "none" | "auto" | number;
  /** Text style for measurement. Default: { fontSize: 14, fontFamily: "Arial, sans-serif" }. */
  typography?: TextStyle;
  /** Custom text measurer. Default: built-in heuristic measurer. */
  measurer?: TextMeasurer;
}

export interface LayoutOptions {
  direction?: LayoutDirection;
  /** Routing strategy for graph edges. Defaults to `"straight"`. */
  routing?: LayoutRouting;
  spacing?: Partial<LayoutSpacing>;
  padding?: number;
  nodeSize?: Partial<Size>;
  /** Node sizing configuration. */
  sizing?: NodeSizingOptions;
}

export interface PositionedNode extends DiagramNode, Size, Point {
  /** Pre-computed label lines from auto-sizing. Present when sizing mode is "auto". */
  labelLines?: string[];
}

export interface PositionedEdge extends DiagramEdge {
  waypoints: Point[];
}

export interface PositionedGroup extends DiagramGroup, Size, Point {
  lanes?: PositionedGroupLane[];
}

export interface PositionedGroupLane extends Size, Point {
  id: string;
  label?: string;
  childIds: string[];
}

export interface ActivationBar extends Size, Point {
  id: string;
  nodeId: string;
  edgeId: string;
}

export interface PositionedDiagram {
  document: DiagramDocument;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  groups: PositionedGroup[];
  activations: ActivationBar[];
  width: number;
  height: number;
}

export interface LayoutEngine {
  name: string;
  supports(document: DiagramDocument): boolean;
  layout(document: DiagramDocument, options?: LayoutOptions): Promise<PositionedDiagram>;
}

export interface NormalizedLayoutOptions {
  direction: LayoutDirection;
  routing: LayoutRouting;
  spacing: LayoutSpacing;
  padding: number;
  nodeSize: Size;
  sizing: NormalizedNodeSizingOptions;
}
