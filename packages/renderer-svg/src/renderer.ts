import type { DiagramDocument, SourceRef } from "@drawspec/core";
import type {
  ActivationBar,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedGroup,
  PositionedNode,
} from "@drawspec/layout";
import { renderThemeStyleBlock, resolveStyle, resolveTheme } from "./styles";
import {
  compareStable,
  formatNumber,
  measureText,
  renderElement,
  type SvgElementSpec,
  stableSvgId,
} from "./svg";
import type { ArrowMarkerShape, Renderer, SvgOutput, SvgRenderOptions, SvgViewport } from "./types";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const DEFAULT_AUTO_FIT_PADDING = 20;

/** Check if a rectangle overlaps with the viewport. Returns true if there is overlap. */
function rectInViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: SvgViewport
): boolean {
  return (
    x + width >= viewport.x &&
    x <= viewport.x + viewport.width &&
    y + height >= viewport.y &&
    y <= viewport.y + viewport.height
  );
}

/** Check if the axis-aligned bounding box of an edge's waypoints overlaps with the viewport. */
function edgeInViewport(waypoints: readonly Point[], viewport: SvgViewport): boolean {
  if (waypoints.length === 0) return true;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of waypoints) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return rectInViewport(minX, minY, maxX - minX, maxY - minY, viewport);
}

export class SvgRenderer implements Renderer<SvgOutput, SvgRenderOptions> {
  readonly name = "svg";

  async render(document: DiagramDocument, options: SvgRenderOptions): Promise<SvgOutput> {
    return renderSvgSync(document, options);
  }
}

export async function renderSvg(
  document: DiagramDocument,
  options: SvgRenderOptions
): Promise<SvgOutput> {
  return new SvgRenderer().render(document, options);
}

export function renderSvgSync(document: DiagramDocument, options: SvgRenderOptions): SvgOutput {
  const { positionedDiagram, viewport } = options;
  const theme = resolveTheme(options.theme);
  const autoFit = options.autoFit === true;
  const contentBounds = autoFit
    ? computePaddedBounds(positionedDiagram, options.padding)
    : undefined;
  const width = contentBounds?.width ?? options.width ?? positionedDiagram.width;
  const height = contentBounds?.height ?? options.height ?? positionedDiagram.height;
  const viewBox = contentBounds ?? { x: 0, y: 0, width, height };
  const idPrefix = stableSvgId("drawspec", document.id);
  const title = options.accessibility?.title ?? document.title ?? document.id;
  const metadata = document.metadata as { description?: unknown } | undefined;
  const metadataDescription = metadata?.description;
  const description =
    options.accessibility?.description ??
    (typeof metadataDescription === "string"
      ? metadataDescription
      : `${document.kind} diagram ${document.id}`);
  const labels: SvgLabelSpec[] = [];
  const children: SvgElementSpec[] = [
    { name: "title", attrs: { id: stableSvgId(idPrefix, "title") }, children: [title] },
    { name: "desc", attrs: { id: stableSvgId(idPrefix, "desc") }, children: [description] },
    renderBackground(viewBox, theme.background),
    renderDefs(idPrefix, theme.edgeStroke),
    ...sortById(positionedDiagram.groups)
      .filter(
        (group) =>
          !viewport || rectInViewport(group.x, group.y, group.width, group.height, viewport)
      )
      .map((group) => {
        const result = renderGroup(document, group, options, idPrefix);
        labels.push(...result.labels);
        return result.element;
      }),
    ...sortById(positionedDiagram.edges)
      .filter((edge) => !viewport || edgeInViewport(edge.waypoints, viewport))
      .map((edge) => {
        const result = renderEdge(document, edge, options, idPrefix);
        labels.push(...result.labels);
        return result.element;
      }),
    ...sortById(positionedDiagram.nodes)
      .filter(
        (node) => !viewport || rectInViewport(node.x, node.y, node.width, node.height, viewport)
      )
      .map((node) => {
        const result = renderNode(document, node, options, idPrefix);
        labels.push(...result.labels);
        return result.element;
      }),
    ...sortById(positionedDiagram.activations)
      .filter((bar) => !viewport || rectInViewport(bar.x, bar.y, bar.width, bar.height, viewport))
      .map((bar) => renderActivation(document, bar, options, idPrefix)),
  ];
  if (labels.length > 0) {
    const adjustedLabels = avoidLabelOverlaps(labels).map((label) => label.element);
    children.push({
      name: "g",
      attrs: { id: stableSvgId(idPrefix, "text-layer") },
      children: adjustedLabels,
    });
  }
  const styleBlock = renderThemeStyleBlock(theme);
  const svg = renderElement({
    name: "svg",
    attrs: {
      "aria-describedby": stableSvgId(idPrefix, "desc"),
      "aria-labelledby": stableSvgId(idPrefix, "title"),
      height,
      id: idPrefix,
      role: options.accessibility?.role ?? "img",
      preserveAspectRatio: options.preserveAspectRatio,
      viewBox: `${formatNumber(viewBox.x)} ${formatNumber(viewBox.y)} ${formatNumber(viewBox.width)} ${formatNumber(viewBox.height)}`,
      width,
      xmlns: "http://www.w3.org/2000/svg",
    },
    children,
  });
  const svgWithStyles = svg.replace(">\n  <title", `>\n${styleBlock}\n  <title`);
  return `${XML_DECLARATION}\n${svgWithStyles}\n`;
}

/** Computes the axis-aligned bounds of all positioned diagram content. */
export function computeContentBounds(positionedDiagram: PositionedDiagram): SvgViewport {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const includeRect = (x: number, y: number, width: number, height: number): void => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  };
  const includePoint = (point: Point): void => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  };

  for (const group of positionedDiagram.groups) {
    includeRect(group.x, group.y, group.width, group.height);
  }
  for (const edge of positionedDiagram.edges) {
    for (const point of edge.waypoints) {
      includePoint(point);
    }
  }
  for (const node of positionedDiagram.nodes) {
    includeRect(node.x, node.y, node.width, node.height);
  }
  for (const bar of positionedDiagram.activations) {
    includeRect(bar.x, bar.y, bar.width, bar.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: 0, y: 0, width: positionedDiagram.width, height: positionedDiagram.height };
  }

  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function computePaddedBounds(
  positionedDiagram: PositionedDiagram,
  padding = DEFAULT_AUTO_FIT_PADDING
): SvgViewport {
  const bounds = computeContentBounds(positionedDiagram);
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: Math.max(1, bounds.width + padding * 2),
    height: Math.max(1, bounds.height + padding * 2),
  };
}

function sourceDataAttrs(source: SourceRef | undefined): Record<string, string | number> {
  if (source === undefined) return {};
  return { "data-source-file": source.file, "data-source-line": source.line };
}

function byId<T extends { id: string }>(left: T, right: T): number {
  return compareStable(left.id, right.id);
}

function sortById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort(byId);
}

type MarkerSpec =
  | { shape: "circle"; attrs: Record<string, string | number> }
  | { shape: "path"; attrs: Record<string, string | number> };

const markerRegistry: Record<Exclude<ArrowMarkerShape, "none">, MarkerSpec> = {
  circle: { shape: "circle", attrs: { cx: 4, cy: 4, fill: "__stroke__", r: 3 } },
  cross: {
    shape: "path",
    attrs: { d: "M 0 0 L 8 8 M 0 8 L 8 0", fill: "none", stroke: "__stroke__" },
  },
  diamond: {
    shape: "path",
    attrs: { d: "M 0 4 L 4 0 L 8 4 L 4 8 z", fill: "__stroke__" },
  },
  "filled-triangle": {
    shape: "path",
    attrs: { d: "M 0 0 L 8 4 L 0 8 z", fill: "__stroke__" },
  },
  "open-arrow": {
    shape: "path",
    attrs: { d: "M 0 0 L 8 4 L 0 8", fill: "none", stroke: "__stroke__" },
  },
  "open-triangle": {
    shape: "path",
    attrs: { d: "M 0 0 L 8 4 L 0 8", fill: "none", stroke: "__stroke__" },
  },
};

function markerId(idPrefix: string, shape: Exclude<ArrowMarkerShape, "none">): string {
  return `${idPrefix}-marker-${shape}`;
}

function markerAttrs(
  attrs: Record<string, string | number>,
  stroke: string
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(attrs).map(([key, value]) => [key, value === "__stroke__" ? stroke : value])
  );
}

function renderDefs(idPrefix: string, stroke: string): SvgElementSpec {
  return {
    name: "defs",
    children: Object.entries(markerRegistry).map(([shape, spec]) => ({
      name: "marker",
      attrs: {
        id: markerId(idPrefix, shape as Exclude<ArrowMarkerShape, "none">),
        markerHeight: 8,
        markerWidth: 8,
        orient: "auto",
        refX: 8,
        refY: 4,
        viewBox: "0 0 8 8",
      },
      children: [{ name: spec.shape, attrs: markerAttrs(spec.attrs, stroke), selfClosing: true }],
    })),
  };
}

function renderBackground(bounds: SvgViewport, fill: string): SvgElementSpec {
  return {
    name: "rect",
    attrs: { fill, height: bounds.height, width: bounds.width, x: bounds.x, y: bounds.y },
    selfClosing: true,
  };
}

interface RenderedElement {
  element: SvgElementSpec;
  labels: SvgLabelSpec[];
}

interface LabelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SvgLabelSpec {
  id: string;
  element: SvgElementSpec;
  bounds: LabelBounds;
}

function renderGroup(
  document: DiagramDocument,
  group: PositionedGroup,
  options: SvgRenderOptions,
  idPrefix: string
): RenderedElement {
  const style = resolveStyle(document, group, options.theme, "group");
  const labels: SvgLabelSpec[] = [];
  const children: SvgElementSpec[] = [
    {
      name: "rect",
      attrs: {
        fill: style.fill,
        height: group.height,
        rx: 8,
        ry: 8,
        stroke: style.stroke,
        "stroke-dasharray": style.strokeDasharray,
        "stroke-width": style.strokeWidth,
        width: group.width,
        x: group.x,
        y: group.y,
      },
      selfClosing: true,
    },
  ];
  if (group.label !== undefined) {
    labels.push(
      textElement({
        id: stableSvgId(idPrefix, "label", "group", group.id),
        label: group.label,
        x: group.x + 12,
        y: group.y + 20,
        style,
        anchor: "start",
        maxWidth: Math.max(0, group.width - 24),
        clipBounds: { x: group.x, y: group.y, width: group.width, height: group.height },
      })
    );
  }
  for (const lane of sortById(group.lanes ?? [])) {
    children.push({
      name: "line",
      attrs: {
        stroke: style.stroke,
        "stroke-dasharray": "3 3",
        x1: lane.x,
        x2: lane.x + lane.width,
        y1: lane.y,
        y2: lane.y,
      },
      selfClosing: true,
    });
    if (lane.label !== undefined) {
      labels.push(
        textElement({
          id: stableSvgId(idPrefix, "label", "lane", lane.id),
          label: lane.label,
          x: lane.x + 8,
          y: lane.y + 18,
          style,
          anchor: "start",
          maxWidth: Math.max(0, lane.width - 16),
          clipBounds: { x: lane.x, y: lane.y, width: lane.width, height: lane.height },
        })
      );
    }
  }
  return {
    element: {
      name: "g",
      attrs: { id: stableSvgId(idPrefix, "group", group.id), ...sourceDataAttrs(group.source) },
      children,
    },
    labels,
  };
}

function renderNode(
  document: DiagramDocument,
  node: PositionedNode,
  options: SvgRenderOptions,
  idPrefix: string
): RenderedElement {
  const style = resolveStyle(document, node, options.theme, "node");
  const children = shapeForNode(node, style);
  const label = node.label ?? node.id;
  const verticalCenter = node.y + node.height / 2;
  const baseline = verticalCenter + style.fontSize * 0.35;
  const labels: SvgLabelSpec[] = [
    textElement({
      id: stableSvgId(idPrefix, "label", "node", node.id),
      label,
      x: node.x + node.width / 2,
      y: baseline,
      style,
      anchor: "middle",
      maxWidth: Math.max(0, node.width - style.fontSize),
      clipBounds: { x: node.x, y: node.y, width: node.width, height: node.height },
    }),
  ];
  return {
    element: {
      name: "g",
      attrs: { id: stableSvgId(idPrefix, "node", node.id), ...sourceDataAttrs(node.source) },
      children,
    },
    labels,
  };
}

function shapeForNode(
  node: PositionedNode,
  style: ReturnType<typeof resolveStyle>
): SvgElementSpec[] {
  if (node.kind === "database") {
    const curve = Math.min(18, node.height / 4);
    return [
      {
        name: "path",
        attrs: {
          d: `M ${formatNumber(node.x)} ${formatNumber(node.y + curve)} C ${formatNumber(node.x)} ${formatNumber(node.y - curve / 3)} ${formatNumber(node.x + node.width)} ${formatNumber(node.y - curve / 3)} ${formatNumber(node.x + node.width)} ${formatNumber(node.y + curve)} L ${formatNumber(node.x + node.width)} ${formatNumber(node.y + node.height - curve)} C ${formatNumber(node.x + node.width)} ${formatNumber(node.y + node.height + curve / 3)} ${formatNumber(node.x)} ${formatNumber(node.y + node.height + curve / 3)} ${formatNumber(node.x)} ${formatNumber(node.y + node.height - curve)} Z`,
          fill: style.fill,
          stroke: style.stroke,
          "stroke-width": style.strokeWidth,
        },
        selfClosing: true,
      },
    ];
  }
  const rounded = node.kind === "container" || node.kind === "person" ? 12 : 3;
  const rect: SvgElementSpec = {
    name: "rect",
    attrs: {
      fill: style.fill,
      height: node.height,
      rx: rounded,
      ry: rounded,
      stroke: style.stroke,
      "stroke-width": style.strokeWidth,
      width: node.width,
      x: node.x,
      y: node.y,
    },
    selfClosing: true,
  };
  if (node.kind !== "person") {
    return [rect];
  }
  return [
    rect,
    {
      name: "circle",
      attrs: { cx: node.x + 18, cy: node.y + 16, fill: "none", r: 6, stroke: style.stroke },
      selfClosing: true,
    },
    {
      name: "path",
      attrs: {
        d: `M ${formatNumber(node.x + 18)} ${formatNumber(node.y + 22)} v 15 M ${formatNumber(node.x + 9)} ${formatNumber(node.y + 30)} h 18`,
        fill: "none",
        stroke: style.stroke,
      },
      selfClosing: true,
    },
  ];
}

function renderEdge(
  document: DiagramDocument,
  edge: PositionedEdge,
  options: SvgRenderOptions,
  idPrefix: string
): RenderedElement {
  const style = resolveStyle(document, edge, options.theme, "edge");
  const direction = edge.direction ?? "forward";
  const arrowEnd = style.arrowEnd ?? "filled-triangle";
  const arrowStart = style.arrowStart ?? "filled-triangle";
  const markerEnd =
    direction !== "none" &&
    (direction === "forward" || direction === "bidirectional") &&
    arrowEnd !== "none"
      ? `url(#${markerId(idPrefix, arrowEnd)})`
      : undefined;
  const markerStart =
    direction !== "none" &&
    (direction === "backward" || direction === "bidirectional") &&
    arrowStart !== "none"
      ? `url(#${markerId(idPrefix, arrowStart)})`
      : undefined;
  const children: SvgElementSpec[] = [
    {
      name: "path",
      attrs: {
        d: edgePath(edge.waypoints),
        fill: "none",
        "marker-end": markerEnd,
        "marker-start": markerStart,
        stroke: style.stroke,
        "stroke-width": style.strokeWidth,
      },
      selfClosing: true,
    },
  ];
  const labels: SvgLabelSpec[] = [];
  if (edge.label !== undefined) {
    const mid = midpoint(edge.waypoints);
    const maxWidth = availableEdgeLabelWidth(edge.waypoints, mid, style.fontSize);
    labels.push(
      textElement({
        id: stableSvgId(idPrefix, "label", "edge", edge.id),
        label: edge.label,
        x: mid.x,
        y: mid.y - Math.max(8, style.fontSize * 0.5),
        style,
        anchor: "middle",
        ...(maxWidth === undefined ? {} : { maxWidth }),
      })
    );
  }
  return {
    element: {
      name: "g",
      attrs: { id: stableSvgId(idPrefix, "edge", edge.id), ...sourceDataAttrs(edge.source) },
      children,
    },
    labels,
  };
}
function edgePath(points: Point[]): string {
  const [first, ...rest] = points;
  if (first === undefined) {
    return "M 0 0";
  }
  return [
    `M ${formatNumber(first.x)} ${formatNumber(first.y)}`,
    ...rest.map((point) => `L ${formatNumber(point.x)} ${formatNumber(point.y)}`),
  ].join(" ");
}

function midpoint(points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  const index = Math.floor((points.length - 1) / 2);
  const current = points[index];
  const next = points[index + 1];
  if (current === undefined) {
    return { x: 0, y: 0 };
  }
  if (next === undefined) {
    return current;
  }
  return { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 };
}

function availableEdgeLabelWidth(
  points: Point[],
  mid: Point,
  fontSize: number
): number | undefined {
  if (points.length < 2) {
    return undefined;
  }
  const horizontalSegments = points
    .slice(0, -1)
    .map((point, index) => ({ current: point, next: points[index + 1] }))
    .filter((segment): segment is { current: Point; next: Point } => segment.next !== undefined)
    .filter((segment) => Math.abs(segment.current.y - segment.next.y) <= fontSize);

  const containingSegment = horizontalSegments.find(
    (segment) =>
      mid.x >= Math.min(segment.current.x, segment.next.x) &&
      mid.x <= Math.max(segment.current.x, segment.next.x)
  );
  const segment = containingSegment ?? horizontalSegments[0];
  if (segment === undefined) {
    return undefined;
  }
  const width = Math.abs(segment.next.x - segment.current.x) - fontSize * 2;
  return Math.max(fontSize * 2, width);
}

function renderActivation(
  document: DiagramDocument,
  bar: ActivationBar,
  options: SvgRenderOptions,
  idPrefix: string
): SvgElementSpec {
  const proxy = { id: bar.id, kind: "activation" };
  const style = resolveStyle(document, proxy, options.theme, "activation");
  return {
    name: "rect",
    attrs: {
      fill: style.fill,
      height: bar.height,
      id: stableSvgId(idPrefix, "activation", bar.id),
      rx: 2,
      ry: 2,
      stroke: style.stroke,
      "stroke-width": style.strokeWidth,
      width: bar.width,
      x: bar.x,
      y: bar.y,
    },
    selfClosing: true,
  };
}

interface TextElementOptions {
  id: string;
  label: string;
  x: number;
  y: number;
  style: ReturnType<typeof resolveStyle>;
  anchor: "start" | "middle";
  maxWidth?: number;
  clipBounds?: LabelBounds;
}

function textElement(options: TextElementOptions): SvgLabelSpec {
  const { anchor, clipBounds, id, label, maxWidth, style, x, y } = options;
  const constrainedWidth = maxWidth === undefined ? undefined : Math.max(0, maxWidth);
  const displayLabel = truncateText(label, style.fontSize, constrainedWidth);
  const width = measureText(displayLabel, style.fontSize);
  const shouldClip = constrainedWidth !== undefined && width > constrainedWidth;
  const text: SvgElementSpec = {
    name: "text",
    attrs: {
      "clip-path": shouldClip ? `url(#${stableSvgId(id, "clip")})` : undefined,
      "data-width": width,
      fill: style.text,
      "font-family": style.fontFamily,
      "font-size": style.fontSize,
      id,
      "text-anchor": anchor,
      x,
      y,
    },
    children: [displayLabel],
  };
  const textBounds = labelBounds(x, y, width, style.fontSize, anchor);
  if (!shouldClip) {
    return { id, element: text, bounds: textBounds };
  }
  const bounds = clipBounds ?? textBounds;
  return {
    id,
    element: {
      name: "g",
      attrs: { id: stableSvgId(id, "clipped") },
      children: [
        {
          name: "clipPath",
          attrs: { id: stableSvgId(id, "clip") },
          children: [
            {
              name: "rect",
              attrs: { height: bounds.height, width: bounds.width, x: bounds.x, y: bounds.y },
              selfClosing: true,
            },
          ],
        },
        text,
      ],
    },
    bounds: intersectBounds(textBounds, bounds),
  };
}

function truncateText(label: string, fontSize: number, maxWidth: number | undefined): string {
  if (maxWidth === undefined || measureText(label, fontSize) <= maxWidth) {
    return label;
  }
  const ellipsis = "…";
  if (measureText(ellipsis, fontSize) >= maxWidth) {
    return ellipsis;
  }
  const characters = [...label];
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${characters.slice(0, mid).join("")}${ellipsis}`;
    if (measureText(candidate, fontSize) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return `${characters.slice(0, low).join("")}${ellipsis}`;
}

function labelBounds(
  x: number,
  y: number,
  width: number,
  fontSize: number,
  anchor: "start" | "middle"
): LabelBounds {
  const left = anchor === "middle" ? x - width / 2 : x;
  return { x: left, y: y - fontSize * 0.8, width, height: fontSize };
}

function intersectBounds(left: LabelBounds, right: LabelBounds): LabelBounds {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const maxX = Math.min(left.x + left.width, right.x + right.width);
  const maxY = Math.min(left.y + left.height, right.y + right.height);
  return { x, y, width: Math.max(0, maxX - x), height: Math.max(0, maxY - y) };
}

function avoidLabelOverlaps(labels: readonly SvgLabelSpec[]): SvgLabelSpec[] {
  const placed: SvgLabelSpec[] = [];
  const adjusted: SvgLabelSpec[] = [];
  for (const label of [...labels].sort((left, right) => compareStable(left.id, right.id))) {
    let bounds = { ...label.bounds };
    let offsetX = 0;
    let offsetY = 0;
    for (const previous of placed) {
      if (!boundsOverlap(bounds, previous.bounds, 2)) {
        continue;
      }
      const shiftY = previous.bounds.y + previous.bounds.height - bounds.y + 2;
      offsetY += shiftY;
      bounds = { ...bounds, y: bounds.y + shiftY };
      if (boundsOverlap(bounds, previous.bounds, 2)) {
        offsetX += previous.bounds.x + previous.bounds.width - bounds.x + 2;
        bounds = { ...bounds, x: bounds.x + offsetX };
      }
    }
    const element =
      offsetX === 0 && offsetY === 0
        ? label.element
        : withTransform(
            label.element,
            `translate(${formatNumber(offsetX)} ${formatNumber(offsetY)})`
          );
    const shifted = { id: label.id, element, bounds };
    placed.push(shifted);
    adjusted.push(shifted);
  }
  return adjusted;
}

function boundsOverlap(left: LabelBounds, right: LabelBounds, padding: number): boolean {
  return (
    left.x < right.x + right.width + padding &&
    left.x + left.width + padding > right.x &&
    left.y < right.y + right.height + padding &&
    left.y + left.height + padding > right.y
  );
}

function withTransform(element: SvgElementSpec, transform: string): SvgElementSpec {
  return { ...element, attrs: { ...element.attrs, transform } };
}
