import type { DiagramDocument } from "@drawspec/core";
import type { PositionedDiagram } from "@drawspec/layout";

export type SvgOutput = string;

export interface Renderer<TOutput = string, TOptions = unknown> {
  name: string;
  render(document: DiagramDocument, options: TOptions): Promise<TOutput>;
}

export interface SvgAccessibilityOptions {
  title?: string;
  description?: string;
  role?: "img" | "graphics-document";
}

export interface SvgTheme {
  background: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  nodeFill: string;
  nodeStroke: string;
  edgeStroke: string;
  groupFill: string;
  groupStroke: string;
  activationFill: string;
  activationStroke: string;
}

export interface SvgRenderOptions {
  positionedDiagram: PositionedDiagram;
  width?: number;
  height?: number;
  accessibility?: SvgAccessibilityOptions;
  theme?: Partial<SvgTheme>;
}

export interface ResolvedStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  strokeDasharray?: string;
}
