import type { DiagramDocument, NodeShapeSpec } from "@drawspec/core";

/** Supported node shapes for mindmap nodes. */
export type MindmapNodeShape = "rounded" | "square" | "circle" | "cloud" | "bang";

/** Color and style applied to a top-level branch and its descendants. */
export interface BranchStyle {
  /** Branch color as a hex string (e.g., `"#4f46e5"`). */
  readonly color: string;
}

/** A node in a mindmap tree. */
export interface MindmapNode {
  /** Deterministic node identifier. */
  readonly id: string;
  /** Display text for the node. */
  readonly text: string;
  /** Optional shape override. Default: `"rounded"`. */
  readonly shape?: MindmapNodeShape;
  /** Optional branch color override (hex string). */
  readonly color?: string;
  /** Child nodes nested below this node. */
  readonly children: readonly MindmapNode[];
}

/** Domain model for a mindmap before compilation to IR. */
export interface MindmapDomainModel {
  /** Deterministic document identifier. */
  readonly id: string;
  /** Diagram title. */
  readonly title: string;
  /** Root node of the mindmap. */
  readonly root: MindmapNode;
}

/** Compiled mindmap document in DrawSpec IR format. */
export type MindmapDocument = DiagramDocument & { kind: "mindmap" };

/** Options for creating a mindmap node via the builder API. */
export interface MindmapNodeOptions {
  /** Node shape. Default: `"rounded"`. */
  readonly shape?: MindmapNodeShape;
  /** Branch color override as hex string. */
  readonly color?: string;
}

/** Builder interface for a node that can have children added. */
export interface MindmapNodeBuilder {
  /** Add a child node to this node. */
  node(text: string, options?: MindmapNodeOptions): MindmapNodeBuilder;
  /** Add nested children via a callback. */
  children(define: (ctx: MindmapChildrenBuilder) => void): MindmapNodeBuilder;
}

/** Builder interface for the children context inside a callback. */
export interface MindmapChildrenBuilder {
  /** Add a child node. */
  node(text: string, options?: MindmapNodeOptions): MindmapNodeBuilder;
}

/** Default branch color palette — 8 distinct colors cycled deterministically. */
export const BRANCH_COLORS: readonly string[] = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#be185d",
  "#0d9488",
];

/** Maps a MindmapNodeShape to a NodeShapeSpec for the IR. */
export function mapShape(shape: MindmapNodeShape | undefined): NodeShapeSpec {
  switch (shape) {
    case "square":
      return { type: "rect" };
    case "circle":
      return { type: "circle" };
    case "cloud":
      return { type: "rounded-rect", radius: 20 };
    case "bang":
      return { type: "rounded-rect", radius: 8 };
    default:
      return { type: "rounded-rect", radius: 12 };
  }
}

/** Lightens a hex color by blending toward white. Depth factor 0–1. */
export function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
