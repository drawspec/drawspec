import type { DiagramDocument, DiagramEdge, DiagramGroup, DiagramNode } from "@drawspec/core";

export type { DiagramDocument, DiagramEdge, DiagramGroup, DiagramNode };

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

export interface LayoutOptions {
  direction?: LayoutDirection;
  /** Routing strategy for graph edges. Defaults to `"straight"`. */
  routing?: LayoutRouting;
  spacing?: Partial<LayoutSpacing>;
  padding?: number;
  nodeSize?: Partial<Size>;
}

export interface PositionedNode extends DiagramNode, Size, Point {}

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
}
