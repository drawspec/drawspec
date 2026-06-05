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

export interface SvgViewport {
  /** X coordinate of the viewport origin. */
  x: number;
  /** Y coordinate of the viewport origin. */
  y: number;
  /** Width of the viewport. */
  width: number;
  /** Height of the viewport. */
  height: number;
}

export interface SvgRenderOptions {
  positionedDiagram: PositionedDiagram;
  width?: number;
  height?: number;
  accessibility?: SvgAccessibilityOptions;
  theme?: Partial<SvgTheme>;
  /** Optional viewport for culling off-screen elements. Elements entirely outside this rectangle are skipped. */
  viewport?: SvgViewport;
}

/** Named SVG stroke dash presets for connection lines. */
export type LineStyle = "solid" | "dashed" | "dotted" | "dash-dot";

export interface ResolvedStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  lineStyle?: LineStyle;
  strokeDasharray?: string;
}
