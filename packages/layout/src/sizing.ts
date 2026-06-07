import type {
  DiagramNode,
  IconPlacement,
  IconSpec,
  LabelOverflow,
  NodeLayoutOptions,
} from "@drawspec/core";
import type { TextMeasurer } from "@drawspec/text-measure";
import { truncateText, wrapText } from "@drawspec/text-measure";
import { normalizeNodeVisuals } from "./normalize";
import type { NodeContentLayout, PositionedIcon, Size } from "./types";

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
  /** Document-level label overflow behavior. */
  labelOverflow: LabelOverflow;
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
  contentLayout: NodeContentLayout;
}

const ICON_GAP = 4;
const ICON_LABEL_GAP = 6;
const DEFAULT_BUILTIN_ICON_SIZE: Size = { width: 24, height: 30 };
const DEFAULT_TEXT_ICON_FONT_SIZE = 24;
type IconSide = "top" | "bottom" | "left" | "right";

interface IconLayoutItem extends PositionedIcon {
  side: IconSide;
  offset: { x: number; y: number };
}

interface SlotMetrics {
  contentWidth: number;
  contentHeight: number;
}

/** Size graph nodes from their labels and layout sizing options. */
export function sizeGraphNodes(
  nodes: DiagramNode[],
  options: NormalizedNodeSizingOptions
): SizedNode[] {
  return nodes.map((node) => sizeNode(node, options));
}

/** Sizes a graph node and computes relative positions for its label and icons. */
export function sizeNode(node: DiagramNode, global: NormalizedNodeSizingOptions): SizedNode {
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
  const labelOverflow = layout?.labelOverflow ?? global.labelOverflow;
  const explicitWidth = layout?.width;
  const explicitHeight = layout?.height;
  const label = node.label ?? node.id;
  const visuals = normalizeNodeVisuals(node);
  const iconItems = visuals.icons.map((icon, index) => measureIcon(node.id, icon, index, global));

  if (mode === "fixed") {
    const width = clamp(explicitWidth ?? global.defaultSize.width, minWidth, maxWidth);
    const height = clamp(explicitHeight ?? global.defaultSize.height, minHeight, maxHeight);
    const labelLines =
      labelOverflow === "truncate"
        ? truncateLabelLines(label, width - padding.x * 2, global.fontSize)
        : wrapLabelLines(label, width - padding.x * 2, global.fontSize);
    const contentLayout = layoutContent(labelLines, iconItems, width, height, global);
    return {
      ...node,
      shape: visuals.shape,
      icons: visuals.icons,
      computedWidth: width,
      computedHeight: height,
      labelLines,
      contentLayout,
    };
  }

  const maxContentWidth = maxWidth !== Infinity ? maxWidth - padding.x * 2 : undefined;
  let labelLines =
    labelWrap === "none"
      ? label.split("\n")
      : wrapLabelLines(label, labelWrap === "auto" ? maxContentWidth : labelWrap, global.fontSize);

  const labelWidth = Math.max(
    0,
    ...labelLines.map((line) => global.measurer.measure(line, global.fontSize))
  );
  const labelHeight = labelLines.length * global.lineHeight;
  const contentMetrics = measureSlotMetrics(labelWidth, labelHeight, iconItems);

  let width =
    explicitWidth ??
    Math.max(global.defaultSize.width, contentMetrics.contentWidth + padding.x * 2);
  let height =
    explicitHeight ??
    Math.max(global.defaultSize.height, contentMetrics.contentHeight + padding.y * 2);

  if (explicitWidth === undefined && maxWidth !== Infinity && width > maxWidth) {
    width = maxWidth;
    const iconHorizontalSpace = horizontalIconSpace(iconItems);
    labelLines =
      labelOverflow === "truncate"
        ? truncateLabelLines(
            label,
            Math.max(0, maxWidth - padding.x * 2 - iconHorizontalSpace),
            global.fontSize
          )
        : wrapLabelLines(
            label,
            Math.max(0, maxWidth - padding.x * 2 - iconHorizontalSpace),
            global.fontSize
          );
  }

  if (maxHeight !== Infinity && height > maxHeight) {
    const iconVerticalSpace = verticalIconSpace(iconItems);
    const maxLines = Math.max(
      1,
      Math.floor((maxHeight - padding.y * 2 - iconVerticalSpace) / global.lineHeight)
    );
    labelLines = labelLines.slice(0, maxLines);
    if (labelOverflow === "truncate" && labelLines.length > 0) {
      labelLines[labelLines.length - 1] = `${labelLines[labelLines.length - 1]}…`;
    }
    height = maxHeight;
  }

  width = clamp(width, minWidth, maxWidth);
  height = clamp(height, minHeight, maxHeight);

  const contentLayout = layoutContent(labelLines, iconItems, width, height, global);

  return {
    ...node,
    shape: visuals.shape,
    icons: visuals.icons,
    computedWidth: width,
    computedHeight: height,
    labelLines,
    contentLayout,
  };
}

function placementSide(placement: IconPlacement | undefined): IconSide {
  if (placement === undefined) {
    return "top";
  }
  return typeof placement === "string" ? placement : placement.side;
}

function placementOffset(placement: IconPlacement | undefined): { x: number; y: number } {
  if (placement === undefined || typeof placement === "string") {
    return { x: 0, y: 0 };
  }
  return placement.offset ?? { x: 0, y: 0 };
}

function measureIcon(
  nodeId: string,
  icon: IconSpec,
  index: number,
  global: NormalizedNodeSizingOptions
): IconLayoutItem {
  const size =
    icon.size ??
    (icon.type === "text"
      ? {
          width: global.measurer.measure(icon.text, icon.fontSize ?? DEFAULT_TEXT_ICON_FONT_SIZE),
          height: icon.fontSize ?? DEFAULT_TEXT_ICON_FONT_SIZE,
        }
      : DEFAULT_BUILTIN_ICON_SIZE);
  return {
    id: icon.id ?? `${nodeId}:icon:${index}`,
    spec: icon,
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    side: placementSide(icon.placement),
    offset: placementOffset(icon.placement),
  };
}

function rowWidth(items: readonly IconLayoutItem[]): number {
  return items.reduce((sum, item, index) => sum + item.width + (index === 0 ? 0 : ICON_GAP), 0);
}

function rowHeight(items: readonly IconLayoutItem[]): number {
  return Math.max(0, ...items.map((item) => item.height));
}

function columnWidth(items: readonly IconLayoutItem[]): number {
  return Math.max(0, ...items.map((item) => item.width));
}

function columnHeight(items: readonly IconLayoutItem[]): number {
  return items.reduce((sum, item, index) => sum + item.height + (index === 0 ? 0 : ICON_GAP), 0);
}

function groupIcons(items: readonly IconLayoutItem[]): Record<IconSide, IconLayoutItem[]> {
  return {
    top: items.filter((item) => item.side === "top"),
    bottom: items.filter((item) => item.side === "bottom"),
    left: items.filter((item) => item.side === "left"),
    right: items.filter((item) => item.side === "right"),
  };
}

function horizontalIconSpace(items: readonly IconLayoutItem[]): number {
  const groups = groupIcons(items);
  const left = columnWidth(groups.left);
  const right = columnWidth(groups.right);
  return left + right + (left > 0 ? ICON_LABEL_GAP : 0) + (right > 0 ? ICON_LABEL_GAP : 0);
}

function verticalIconSpace(items: readonly IconLayoutItem[]): number {
  const groups = groupIcons(items);
  const top = rowHeight(groups.top);
  const bottom = rowHeight(groups.bottom);
  return top + bottom + (top > 0 ? ICON_LABEL_GAP : 0) + (bottom > 0 ? ICON_LABEL_GAP : 0);
}

function measureSlotMetrics(
  labelWidth: number,
  labelHeight: number,
  items: readonly IconLayoutItem[]
): SlotMetrics {
  const groups = groupIcons(items);
  const topWidth = rowWidth(groups.top);
  const bottomWidth = rowWidth(groups.bottom);
  const leftWidth = columnWidth(groups.left);
  const rightWidth = columnWidth(groups.right);
  const leftHeight = columnHeight(groups.left);
  const rightHeight = columnHeight(groups.right);
  const middleWidth =
    leftWidth +
    labelWidth +
    rightWidth +
    (leftWidth > 0 ? ICON_LABEL_GAP : 0) +
    (rightWidth > 0 ? ICON_LABEL_GAP : 0);
  const middleHeight = Math.max(labelHeight, leftHeight, rightHeight);
  const topHeight = rowHeight(groups.top);
  const bottomHeight = rowHeight(groups.bottom);
  return {
    contentWidth: Math.max(topWidth, bottomWidth, middleWidth),
    contentHeight:
      topHeight +
      middleHeight +
      bottomHeight +
      (topHeight > 0 ? ICON_LABEL_GAP : 0) +
      (bottomHeight > 0 ? ICON_LABEL_GAP : 0),
  };
}

function positionRow(
  items: readonly IconLayoutItem[],
  x: number,
  y: number,
  width: number,
  height: number
): PositionedIcon[] {
  let nextX = x + (width - rowWidth(items)) / 2;
  return items.map((item, index) => {
    if (index > 0) {
      nextX += ICON_GAP;
    }
    const positioned = {
      id: item.id,
      spec: item.spec,
      x: nextX + item.offset.x,
      y: y + (height - item.height) / 2 + item.offset.y,
      width: item.width,
      height: item.height,
    };
    nextX += item.width;
    return positioned;
  });
}

function positionColumn(
  items: readonly IconLayoutItem[],
  x: number,
  y: number,
  width: number,
  height: number
): PositionedIcon[] {
  let nextY = y + (height - columnHeight(items)) / 2;
  return items.map((item, index) => {
    if (index > 0) {
      nextY += ICON_GAP;
    }
    const positioned = {
      id: item.id,
      spec: item.spec,
      x: x + (width - item.width) / 2 + item.offset.x,
      y: nextY + item.offset.y,
      width: item.width,
      height: item.height,
    };
    nextY += item.height;
    return positioned;
  });
}

function layoutContent(
  labelLines: string[],
  items: readonly IconLayoutItem[],
  nodeWidth: number,
  nodeHeight: number,
  global: NormalizedNodeSizingOptions
): NodeContentLayout {
  const labelWidth = Math.max(
    0,
    ...labelLines.map((line) => global.measurer.measure(line, global.fontSize))
  );
  const labelHeight = labelLines.length * global.lineHeight;
  const groups = groupIcons(items);
  const metrics = measureSlotMetrics(labelWidth, labelHeight, items);
  const topHeight = rowHeight(groups.top);
  const bottomHeight = rowHeight(groups.bottom);
  const leftWidth = columnWidth(groups.left);
  const rightWidth = columnWidth(groups.right);
  const leftHeight = columnHeight(groups.left);
  const rightHeight = columnHeight(groups.right);
  const middleHeight = Math.max(labelHeight, leftHeight, rightHeight);
  const middleWidth =
    leftWidth +
    labelWidth +
    rightWidth +
    (leftWidth > 0 ? ICON_LABEL_GAP : 0) +
    (rightWidth > 0 ? ICON_LABEL_GAP : 0);
  const contentX = (nodeWidth - metrics.contentWidth) / 2;
  const contentY = (nodeHeight - metrics.contentHeight) / 2;
  const middleY = contentY + topHeight + (topHeight > 0 ? ICON_LABEL_GAP : 0);
  const middleX = contentX + (metrics.contentWidth - middleWidth) / 2;
  const labelLeftEdge = middleX + leftWidth + (leftWidth > 0 ? ICON_LABEL_GAP : 0);
  const labelX = labelLeftEdge + labelWidth / 2;
  const labelY =
    middleY +
    middleHeight / 2 +
    global.fontSize * 0.35 -
    ((labelLines.length - 1) * global.lineHeight) / 2;
  const rightX = labelLeftEdge + labelWidth + (rightWidth > 0 ? ICON_LABEL_GAP : 0);
  const bottomY = middleY + middleHeight + (bottomHeight > 0 ? ICON_LABEL_GAP : 0);
  const icons = [
    ...positionRow(groups.top, contentX, contentY, metrics.contentWidth, topHeight),
    ...positionColumn(groups.left, middleX, middleY, leftWidth, middleHeight),
    ...positionColumn(groups.right, rightX, middleY, rightWidth, middleHeight),
    ...positionRow(groups.bottom, contentX, bottomY, metrics.contentWidth, bottomHeight),
  ];
  return { label: { x: labelX, y: labelY, lines: labelLines }, icons };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapLabelLines(label: string, wrapWidth: number | undefined, fontSize: number): string[] {
  if (wrapWidth === undefined) {
    return label.split("\n");
  }
  return wrapText(label, wrapWidth, fontSize);
}

function truncateLabelLines(
  label: string,
  maxWidth: number | undefined,
  fontSize: number
): string[] {
  if (maxWidth === undefined) {
    return label.split("\n");
  }
  return label.split("\n").map((line) => truncateText(line, maxWidth, fontSize));
}
