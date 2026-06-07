import type { DiagramDocument } from "@drawspec/core";
import type { LayoutRouting, PositionedDiagram } from "@drawspec/layout";

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

/** Named theme preset or a custom theme object. */
export type SvgThemeInput = "light" | "dark" | "high-contrast" | Partial<SvgTheme>;

export interface SvgRenderOptions {
  positionedDiagram: PositionedDiagram;
  width?: number;
  height?: number;
  accessibility?: SvgAccessibilityOptions;
  /** Theme preset name ("light", "dark", "high-contrast") or a custom theme override. Defaults to "light". */
  theme?: SvgThemeInput;
  /** Explicit theme preset name used for style defaults when `theme` is a custom object. */
  themeName?: string;
  /** Optional viewport for culling off-screen elements. Elements entirely outside this rectangle are skipped. */
  viewport?: SvgViewport;
  /** Edge routing strategy. Defaults to "straight". */
  routing?: LayoutRouting;
  /** Padding around diagram content (pixels). Applied when autoFit is true. */
  padding?: number;
  /** Automatically fit viewport to content bounds. */
  autoFit?: boolean;
  /** Preserve aspect ratio. Default: "xMidYMid meet". */
  preserveAspectRatio?: string;
}

/** Supported SVG edge arrowhead marker shapes. */
export type ArrowMarkerShape =
  | "filled-triangle"
  | "open-triangle"
  | "open-arrow"
  | "diamond"
  | "circle"
  | "cross"
  | "none";

/** Named SVG stroke dash presets for connection lines. */
export type LineStyle = "solid" | "dashed" | "dotted" | "dash-dot";

export interface ResolvedStyle {
  arrowEnd?: ArrowMarkerShape;
  arrowStart?: ArrowMarkerShape;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  /** Background color for edge labels. Defaults to theme background (invisible line interruption). */
  labelBg: string;
  lineStyle?: LineStyle;
  strokeDasharray?: string;
}
