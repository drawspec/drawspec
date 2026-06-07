import type { DiagramNode, NodeLayoutOptions } from "@drawspec/core";
import type { TextMeasurer } from "@drawspec/text-measure";
import type { Size } from "./types";

/** Fully resolved node sizing options used by graph layout. */
export interface NormalizedNodeSizingOptions {
  /** Sizing mode. */
  mode: "auto" | "fixed";
  /** Base size for fixed nodes and default minimum base for auto-sized nodes. */
  defaultSize: Size;
  /** Minimum node size. */
  minSize: Size;
  /** Maximum node size. */
  maxSize: Size;
  /** Padding around label text. */
  padding: { x: number; y: number };
  /** Label wrapping behavior. */
  labelWrap: "none" | "auto" | number;
  /** Font size in pixels. */
  fontSize: number;
  /** Line height in pixels. */
  lineHeight: number;
  /** Deterministic text measurer. */
  measurer: TextMeasurer;
}

/** Diagram node augmented with computed layout-side sizing metadata. */
export interface SizedNode extends DiagramNode {
  computedWidth: number;
  computedHeight: number;
  labelLines: string[];
}

const ELLIPSIS = "…";

/** Size graph nodes from their labels and layout sizing options. */
export function sizeGraphNodes(
  nodes: DiagramNode[],
  options: NormalizedNodeSizingOptions
): SizedNode[] {
  return nodes.map((node) => sizeNode(node, options));
}

function sizeNode(node: DiagramNode, global: NormalizedNodeSizingOptions): SizedNode {
  const layout: NodeLayoutOptions | undefined = node.layout;
  const mode = layout?.width !== undefined && layout.height !== undefined ? "fixed" : global.mode;
  const minWidth = layout?.minWidth ?? global.minSize.width;
  const minHeight = layout?.minHeight ?? global.minSize.height;
  const maxWidth = layout?.maxWidth ?? global.maxSize.width;
  const maxHeight = layout?.maxHeight ?? global.maxSize.height;
  const padding = {
    x: layout?.padding?.x ?? global.padding.x,
    y: layout?.padding?.y ?? global.padding.y,
  };
  const labelWrap = layout?.labelWrap ?? global.labelWrap;
  const explicitWidth = layout?.width;
  const explicitHeight = layout?.height;
  const label = node.label ?? node.id;

  if (mode === "fixed") {
    const width = clamp(explicitWidth ?? global.defaultSize.width, minWidth, maxWidth);
    const height = clamp(explicitHeight ?? global.defaultSize.height, minHeight, maxHeight);
    const labelLines = truncateToWidth(
      label,
      width - padding.x * 2,
      global.measurer,
      global.fontSize
    );
    return { ...node, computedWidth: width, computedHeight: height, labelLines };
  }

  const maxContentWidth = maxWidth !== Infinity ? maxWidth - padding.x * 2 : undefined;
  let labelLines =
    labelWrap === "none"
      ? label.split("\n")
      : wrapLabelLines(
          label,
          labelWrap === "auto" ? maxContentWidth : labelWrap,
          global.measurer,
          global.fontSize
        );

  const contentWidth = Math.max(
    0,
    ...labelLines.map((line) => global.measurer.measure(line, global.fontSize))
  );
  const contentHeight = labelLines.length * global.lineHeight;

  let width = explicitWidth ?? Math.max(global.defaultSize.width, contentWidth + padding.x * 2);
  let height = explicitHeight ?? Math.max(global.defaultSize.height, contentHeight + padding.y * 2);

  if (explicitWidth === undefined && maxWidth !== Infinity && width > maxWidth) {
    width = maxWidth;
    labelLines = truncateLinesToWidth(
      labelLines,
      maxWidth - padding.x * 2,
      global.measurer,
      global.fontSize
    );
  }

  if (maxHeight !== Infinity && height > maxHeight) {
    const maxLines = Math.max(1, Math.floor((maxHeight - padding.y * 2) / global.lineHeight));
    const visibleLines = labelLines.slice(0, maxLines);
    const lastLine = visibleLines.at(-1);
    if (lastLine !== undefined) {
      visibleLines[visibleLines.length - 1] = `${lastLine}${ELLIPSIS}`;
    }
    labelLines = visibleLines;
    height = maxHeight;
  }

  width = clamp(width, minWidth, maxWidth);
  height = clamp(height, minHeight, maxHeight);

  return { ...node, computedWidth: width, computedHeight: height, labelLines };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapLabelLines(
  label: string,
  wrapWidth: number | undefined,
  measurer: TextMeasurer,
  fontSize: number
): string[] {
  const hardLines = label.split("\n");
  if (hardLines.length > 1) {
    return hardLines.flatMap((line) =>
      wrapWidth !== undefined ? wrapSingleLine(line, wrapWidth, measurer, fontSize) : [line]
    );
  }

  if (wrapWidth === undefined) {
    return [label];
  }
  return wrapSingleLine(label, wrapWidth, measurer, fontSize);
}

function wrapSingleLine(
  text: string,
  wrapWidth: number,
  measurer: TextMeasurer,
  fontSize: number
): string[] {
  if (measurer.measure(text, fontSize) <= wrapWidth) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    if (measurer.measure(candidate, fontSize) <= wrapWidth) {
      currentLine = candidate;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
}

function truncateLinesToWidth(
  lines: string[],
  maxContentWidth: number,
  measurer: TextMeasurer,
  fontSize: number
): string[] {
  return lines.map((line) =>
    measurer.measure(line, fontSize) <= maxContentWidth
      ? line
      : truncateLineToWidth(line, maxContentWidth, measurer, fontSize)
  );
}

function truncateToWidth(
  label: string,
  maxContentWidth: number,
  measurer: TextMeasurer,
  fontSize: number
): string[] {
  if (measurer.measure(label, fontSize) <= maxContentWidth) {
    return [label];
  }
  return [truncateLineToWidth(label, maxContentWidth, measurer, fontSize)];
}

function truncateLineToWidth(
  line: string,
  maxContentWidth: number,
  measurer: TextMeasurer,
  fontSize: number
): string {
  const chars = [...line];
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${chars.slice(0, mid).join("")}${ELLIPSIS}`;
    if (measurer.measure(candidate, fontSize) <= maxContentWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return `${chars.slice(0, low).join("")}${ELLIPSIS}`;
}
