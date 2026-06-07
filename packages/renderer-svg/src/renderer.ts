import type {
  BuiltinIconSpec,
  DiagramDocument,
  IconAppearance,
  ImageIconSpec,
  NodeShapeSpec,
  SourceRef,
  TextIconSpec,
} from "@drawspec/core";
import type {
  ActivationBar,
  LayoutRouting,
  NodeContentLayout,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedGroup,
  PositionedIcon,
  PositionedNode,
} from "@drawspec/layout";
import { measureText, truncateText, wrapText } from "@drawspec/text-measure";
import { darkTheme, renderThemeStyleBlock, resolveStyle, resolveTheme } from "./styles";
import {
  compareStable,
  formatNumber,
  renderElement,
  type SvgElementSpec,
  stableSvgId,
} from "./svg";
import type {
  ArrowMarkerShape,
  Renderer,
  ResolvedStyle,
  SvgOutput,
  SvgRenderOptions,
  SvgViewport,
} from "./types";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const DEFAULT_AUTO_FIT_PADDING = 20;
const EDGE_LABEL_MAX_WIDTH = 240;
const EDGE_LABEL_BG_PADDING = 4;

interface OcclusionRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type PositionedNodeWithContentLayout = PositionedNode & {
  contentLayout?: NodeContentLayout;
};

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
  const themeName = resolveThemeName(options);
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
  const occlusionRects = buildOcclusionRects(positionedDiagram);
  const groupBounds = buildGroupBounds(positionedDiagram);
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
        const result = renderGroup(document, group, options, idPrefix, themeName);
        labels.push(...result.labels);
        return result.element;
      }),
    ...sortById(positionedDiagram.edges)
      .filter((edge) => !viewport || edgeInViewport(edge.waypoints, viewport))
      .map((edge) => {
        const result = renderEdge(document, edge, options, idPrefix, themeName);
        labels.push(...result.labels);
        return result.element;
      }),
    ...sortById(positionedDiagram.nodes)
      .filter(
        (node) => !viewport || rectInViewport(node.x, node.y, node.width, node.height, viewport)
      )
      .map((node) => {
        const result = renderNode(document, node, options, idPrefix, themeName);
        labels.push(...result.labels);
        return result.element;
      }),
    ...sortById(positionedDiagram.activations)
      .filter((bar) => !viewport || rectInViewport(bar.x, bar.y, bar.width, bar.height, viewport))
      .map((bar) => renderActivation(document, bar, options, idPrefix, themeName)),
  ];
  if (labels.length > 0) {
    const adjustedLabels = avoidLabelOverlaps(labels, occlusionRects, groupBounds).map(
      (label) => label.element
    );
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

function resolveThemeName(options: SvgRenderOptions): string {
  if (options.themeName !== undefined) {
    return options.themeName;
  }
  if (typeof options.theme === "string") {
    return options.theme;
  }
  return options.theme === darkTheme ? "dark" : "light";
}

function buildOcclusionRects(positionedDiagram: PositionedDiagram): OcclusionRect[] {
  return [
    ...sortById(positionedDiagram.groups).map((group) => ({
      id: group.id,
      x: group.x,
      y: group.y,
      width: group.width,
      height: group.height,
    })),
    ...sortById(positionedDiagram.nodes).map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    })),
  ];
}

function buildGroupBounds(positionedDiagram: PositionedDiagram): OcclusionRect[] {
  return sortById(positionedDiagram.groups).map((group) => ({
    id: group.id,
    x: group.x,
    y: group.y,
    width: group.width,
    height: group.height,
  }));
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
  ownerId?: string;
  element: SvgElementSpec;
  bounds: LabelBounds;
}

function renderGroup(
  document: DiagramDocument,
  group: PositionedGroup,
  options: SvgRenderOptions,
  idPrefix: string,
  themeName: string
): RenderedElement {
  const style = resolveStyle(document, group, options.theme, "group", themeName);
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
    const groupLabelLines =
      group.labelLines ?? wrapText(group.label, Math.max(0, group.width - 24), style.fontSize);
    const groupLineHeight = style.fontSize * 1.3;
    const groupStartY = group.y + 16;
    labels.push(
      ...groupLabelLines.map((line, index) =>
        textElement({
          id: stableSvgId(idPrefix, "label", "group", `${group.id}-line${index}`),
          ownerId: group.id,
          label: line,
          x: group.x + 12,
          y: groupStartY + index * groupLineHeight,
          style,
          anchor: "start",
          clipBounds: { x: group.x, y: group.y, width: group.width, height: group.height },
        })
      )
    );
  }
  for (const lane of sortById(group.lanes ?? [])) {
    const isFirstLane = Math.abs(lane.y - group.y) < 1;
    if (!isFirstLane) {
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
    }
    if (lane.label !== undefined) {
      const laneLabelLines =
        lane.labelLines ?? wrapText(lane.label, Math.max(0, lane.width - 16), style.fontSize);
      const laneLineHeight = style.fontSize * 1.3;
      const laneStartY = isFirstLane ? group.y + 34 : lane.y + 18;
      labels.push(
        ...laneLabelLines.map((line, index) =>
          textElement({
            id: stableSvgId(idPrefix, "label", "lane", `${lane.id}-line${index}`),
            ownerId: lane.id,
            label: line,
            x: lane.x + 8,
            y: laneStartY + index * laneLineHeight,
            style,
            anchor: "start",
            clipBounds: { x: lane.x, y: lane.y, width: lane.width, height: lane.height },
          })
        )
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
  node: PositionedNodeWithContentLayout,
  options: SvgRenderOptions,
  idPrefix: string,
  themeName: string
): RenderedElement {
  const style = resolveStyle(document, node, options.theme, "node", themeName);
  const children = shapeForNode(node, style);
  const contentLayout = node.contentLayout;
  if (contentLayout !== undefined) {
    children.push(
      ...sortById(contentLayout.icons).flatMap((icon) =>
        renderIcon(positionIconFromNodeOrigin(node, icon), style)
      )
    );
  }
  const labelLayout = contentLayout?.label;
  const label = node.label ?? node.id;
  const lines = labelLayout?.lines ?? node.labelLines ?? [label];
  const lineHeight = style.fontSize * 1.3;
  const startY =
    labelLayout === undefined
      ? node.y + node.height / 2 + style.fontSize * 0.35 - ((lines.length - 1) * lineHeight) / 2
      : node.y + labelLayout.y;
  const anchorX = labelLayout === undefined ? node.x + node.width / 2 : node.x + labelLayout.x;
  const labels: SvgLabelSpec[] =
    contentLayout !== undefined && labelLayout === undefined
      ? []
      : lines.map((line, index) =>
          textElement({
            id: stableSvgId(idPrefix, "label", "node", `${node.id}-line${index}`),
            ownerId: node.id,
            label: line,
            x: anchorX,
            y: startY + index * lineHeight,
            style,
            anchor: "middle",
            maxWidth: Math.max(0, node.width - style.fontSize),
            truncate: false,
            clipBounds: { x: node.x, y: node.y, width: node.width, height: node.height },
          })
        );
  return {
    element: {
      name: "g",
      attrs: { id: stableSvgId(idPrefix, "node", node.id), ...sourceDataAttrs(node.source) },
      children,
    },
    labels,
  };
}

function positionIconFromNodeOrigin(node: PositionedNode, icon: PositionedIcon): PositionedIcon {
  return { ...icon, x: node.x + icon.x, y: node.y + icon.y };
}

function shapeForNode(
  node: PositionedNodeWithContentLayout,
  style: ResolvedStyle
): SvgElementSpec[] {
  if (node.contentLayout !== undefined) {
    return outerShapeForNode(node, style);
  }
  if (node.kind === "database") {
    return [
      renderCylinderShape(
        node.x,
        node.y,
        node.width,
        node.height,
        style,
        Math.min(18, node.height / 4)
      ),
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
  if (node.kind !== "person" && node.kind !== "actor") {
    return [rect];
  }
  const centerX = node.x + node.width / 2;
  return [
    rect,
    {
      name: "circle",
      attrs: { cx: centerX, cy: node.y + 16, fill: "none", r: 6, stroke: style.stroke },
      selfClosing: true,
    },
    {
      name: "path",
      attrs: {
        d: `M ${formatNumber(centerX)} ${formatNumber(node.y + 22)} v 15 M ${formatNumber(centerX - 9)} ${formatNumber(node.y + 30)} H ${formatNumber(centerX + 9)}`,
        fill: "none",
        stroke: style.stroke,
      },
      selfClosing: true,
    },
  ];
}

function outerShapeForNode(
  node: PositionedNodeWithContentLayout,
  style: ResolvedStyle
): SvgElementSpec[] {
  const shape = node.shape ?? shapeFromNodeKind(node.kind);
  return shapeForBounds(shape, node.x, node.y, node.width, node.height, style);
}

function shapeFromNodeKind(kind: string): NodeShapeSpec {
  if (kind === "database") {
    return { type: "cylinder" };
  }
  if (kind === "container" || kind === "person") {
    return { type: "rounded-rect", radius: 12 };
  }
  return { type: "rounded-rect", radius: 3 };
}

function shapeForBounds(
  shape: NodeShapeSpec,
  x: number,
  y: number,
  width: number,
  height: number,
  style: ResolvedStyle
): SvgElementSpec[] {
  switch (shape.type) {
    case "none":
      return [];
    case "cylinder":
      return [
        renderCylinderShape(x, y, width, height, style, Math.min(shape.curve ?? 18, height / 4)),
      ];
    case "rect":
      return [renderRectShape(x, y, width, height, style, 0)];
    case "rounded-rect":
      return [renderRectShape(x, y, width, height, style, shape.radius ?? 3)];
  }
}

function renderRectShape(
  x: number,
  y: number,
  width: number,
  height: number,
  style: ResolvedStyle,
  radius: number
): SvgElementSpec {
  return {
    name: "rect",
    attrs: {
      fill: style.fill,
      height,
      rx: radius,
      ry: radius,
      stroke: style.stroke,
      "stroke-width": style.strokeWidth,
      width,
      x,
      y,
    },
    selfClosing: true,
  };
}

function renderCylinderShape(
  x: number,
  y: number,
  width: number,
  height: number,
  style: ResolvedStyle,
  curve: number
): SvgElementSpec {
  return {
    name: "path",
    attrs: {
      d: cylinderPath(x, y, width, height, curve),
      fill: style.fill,
      stroke: style.stroke,
      "stroke-width": style.strokeWidth,
    },
    selfClosing: true,
  };
}

function cylinderPath(x: number, y: number, width: number, height: number, curve: number): string {
  return `M ${formatNumber(x)} ${formatNumber(y + curve)} C ${formatNumber(x)} ${formatNumber(y - curve / 3)} ${formatNumber(x + width)} ${formatNumber(y - curve / 3)} ${formatNumber(x + width)} ${formatNumber(y + curve)} L ${formatNumber(x + width)} ${formatNumber(y + height - curve)} C ${formatNumber(x + width)} ${formatNumber(y + height + curve / 3)} ${formatNumber(x)} ${formatNumber(y + height + curve / 3)} ${formatNumber(x)} ${formatNumber(y + height - curve)} Z`;
}

function renderIcon(icon: PositionedIcon, style: ResolvedStyle): SvgElementSpec[] {
  const spec = icon.spec;
  const appearance = spec.style;

  switch (spec.type) {
    case "builtin":
      return renderBuiltinIcon(icon, spec, appearance, style);
    case "text":
      return renderTextIcon(icon, spec, appearance, style);
    case "image":
      return renderImageIcon(icon, spec, appearance);
  }
}

function renderBuiltinIcon(
  icon: PositionedIcon,
  spec: BuiltinIconSpec,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  switch (spec.name) {
    case "person":
    case "actor":
      return renderPersonIcon(icon, appearance, style);
    case "database":
    case "cylinder":
      return renderCylinderIcon(icon, appearance, style);
    case "component":
      return renderComponentIcon(icon, appearance, style);
    case "queue":
      return renderQueueIcon(icon, appearance, style);
    case "browser":
      return renderBrowserIcon(icon, appearance, style);
    case "mobile":
      return renderMobileIcon(icon, appearance, style);
    case "cloud":
      return renderCloudIcon(icon, appearance, style);
    case "hexagon":
      return renderHexagonIcon(icon, appearance, style);
  }
}

function renderPersonIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const centerX = icon.x + icon.width / 2;
  const paint = lineIconAttrs(appearance, style);
  return [
    {
      name: "circle",
      attrs: { ...paint, cx: centerX, cy: icon.y + 16, r: 6 },
      selfClosing: true,
    },
    {
      name: "path",
      attrs: {
        ...paint,
        d: `M ${formatNumber(centerX)} ${formatNumber(icon.y + 22)} v 15 M ${formatNumber(centerX - 9)} ${formatNumber(icon.y + 30)} H ${formatNumber(centerX + 9)}`,
      },
      selfClosing: true,
    },
  ];
}

function renderCylinderIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const curve = Math.min(8, icon.height / 4);
  return [
    {
      name: "path",
      attrs: {
        ...filledIconAttrs(appearance, style),
        d: cylinderPath(icon.x, icon.y, icon.width, icon.height, curve),
      },
      selfClosing: true,
    },
  ];
}

function renderComponentIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const tabWidth = Math.max(4, icon.width * 0.18);
  const tabHeight = Math.max(3, icon.height * 0.16);
  const tabX = icon.x - tabWidth * 0.25;
  const paint = filledIconAttrs(appearance, style);
  return [
    {
      name: "rect",
      attrs: {
        ...paint,
        height: icon.height,
        rx: 3,
        ry: 3,
        width: icon.width,
        x: icon.x,
        y: icon.y,
      },
      selfClosing: true,
    },
    {
      name: "rect",
      attrs: {
        ...paint,
        height: tabHeight,
        width: tabWidth,
        x: tabX,
        y: icon.y + icon.height * 0.25,
      },
      selfClosing: true,
    },
    {
      name: "rect",
      attrs: {
        ...paint,
        height: tabHeight,
        width: tabWidth,
        x: tabX,
        y: icon.y + icon.height * 0.6,
      },
      selfClosing: true,
    },
  ];
}

function renderQueueIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const paint = lineIconAttrs(appearance, style);
  const gap = Math.max(3, icon.width * 0.12);
  return [0, 1, 2].map((index) => ({
    name: "rect",
    attrs: {
      ...paint,
      height: icon.height - gap * 2,
      rx: 3,
      ry: 3,
      width: icon.width - gap * 2,
      x: icon.x + gap * index,
      y: icon.y + gap * (2 - index),
    },
    selfClosing: true,
  }));
}

function renderBrowserIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const paint = filledIconAttrs(appearance, style);
  const barY = icon.y + Math.max(6, icon.height * 0.22);
  return [
    {
      name: "rect",
      attrs: {
        ...paint,
        height: icon.height,
        rx: 3,
        ry: 3,
        width: icon.width,
        x: icon.x,
        y: icon.y,
      },
      selfClosing: true,
    },
    {
      name: "line",
      attrs: {
        ...strokeOnlyAttrs(appearance, style),
        x1: icon.x,
        x2: icon.x + icon.width,
        y1: barY,
        y2: barY,
      },
      selfClosing: true,
    },
  ];
}

function renderMobileIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const paint = filledIconAttrs(appearance, style);
  const buttonRadius = Math.max(1, Math.min(icon.width, icon.height) * 0.04);
  return [
    {
      name: "rect",
      attrs: {
        ...paint,
        height: icon.height,
        rx: 4,
        ry: 4,
        width: icon.width,
        x: icon.x,
        y: icon.y,
      },
      selfClosing: true,
    },
    {
      name: "circle",
      attrs: {
        fill: appearance?.stroke ?? style.stroke,
        cx: icon.x + icon.width / 2,
        cy: icon.y + icon.height - Math.max(3, icon.height * 0.1),
        opacity: appearance?.opacity,
        r: buttonRadius,
      },
      selfClosing: true,
    },
  ];
}

function renderCloudIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const x = icon.x;
  const y = icon.y;
  const width = icon.width;
  const height = icon.height;
  return [
    {
      name: "path",
      attrs: {
        ...filledIconAttrs(appearance, style),
        d: [
          `M ${fmt(x + width * 0.2)} ${fmt(y + height * 0.72)}`,
          `C ${fmt(x + width * 0.05)} ${fmt(y + height * 0.72)} ${fmt(x)} ${fmt(y + height * 0.48)} ${fmt(x + width * 0.18)} ${fmt(y + height * 0.42)}`,
          `C ${fmt(x + width * 0.22)} ${fmt(y + height * 0.22)} ${fmt(x + width * 0.48)} ${fmt(y + height * 0.18)} ${fmt(x + width * 0.6)} ${fmt(y + height * 0.34)}`,
          `C ${fmt(x + width * 0.78)} ${fmt(y + height * 0.3)} ${fmt(x + width * 0.95)} ${fmt(y + height * 0.44)} ${fmt(x + width * 0.92)} ${fmt(y + height * 0.62)}`,
          `C ${fmt(x + width * 0.9)} ${fmt(y + height * 0.72)} ${fmt(x + width * 0.8)} ${fmt(y + height * 0.72)} ${fmt(x + width * 0.2)} ${fmt(y + height * 0.72)}`,
          "Z",
        ].join(" "),
      },
      selfClosing: true,
    },
  ];
}

function renderHexagonIcon(
  icon: PositionedIcon,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const points = [
    `${fmt(icon.x + icon.width * 0.25)},${fmt(icon.y)}`,
    `${fmt(icon.x + icon.width * 0.75)},${fmt(icon.y)}`,
    `${fmt(icon.x + icon.width)},${fmt(icon.y + icon.height / 2)}`,
    `${fmt(icon.x + icon.width * 0.75)},${fmt(icon.y + icon.height)}`,
    `${fmt(icon.x + icon.width * 0.25)},${fmt(icon.y + icon.height)}`,
    `${fmt(icon.x)},${fmt(icon.y + icon.height / 2)}`,
  ].join(" ");
  return [
    {
      name: "polygon",
      attrs: { ...filledIconAttrs(appearance, style), points },
      selfClosing: true,
    },
  ];
}

function renderTextIcon(
  icon: PositionedIcon,
  spec: TextIconSpec,
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): SvgElementSpec[] {
  const fontSize = spec.fontSize ?? 24;
  return [
    {
      name: "text",
      attrs: {
        fill: appearance?.color ?? style.stroke,
        "font-family": spec.fontFamily ?? style.fontFamily,
        "font-size": fontSize,
        opacity: appearance?.opacity,
        "text-anchor": "middle",
        x: icon.x + icon.width / 2,
        y: icon.y + icon.height / 2 + fontSize * 0.35,
      },
      children: [spec.text],
    },
  ];
}

function renderImageIcon(
  icon: PositionedIcon,
  spec: ImageIconSpec,
  appearance: IconAppearance | undefined
): SvgElementSpec[] {
  const attrs: Record<string, string | number | undefined> = {
    height: icon.height,
    width: icon.width,
    x: icon.x,
    y: icon.y,
  };

  switch (spec.src.type) {
    case "url":
      attrs["href"] = spec.src.href;
      break;
    case "data":
      attrs["href"] = `data:${spec.src.mimeType};base64,${spec.src.data}`;
      break;
    case "asset":
      attrs["href"] = spec.src.href;
      break;
  }

  if (appearance?.opacity !== undefined) {
    attrs["opacity"] = appearance.opacity;
  }

  return [{ name: "image", attrs, selfClosing: true }];
}

function filledIconAttrs(
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): Record<string, string | number | undefined> {
  return {
    fill: appearance?.fill ?? "none",
    opacity: appearance?.opacity,
    stroke: appearance?.stroke ?? style.stroke,
    "stroke-width": appearance?.strokeWidth ?? style.strokeWidth,
  };
}

function lineIconAttrs(
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): Record<string, string | number | undefined> {
  return {
    fill: appearance?.fill ?? "none",
    opacity: appearance?.opacity,
    stroke: appearance?.stroke ?? style.stroke,
    "stroke-width": appearance?.strokeWidth,
  };
}

function strokeOnlyAttrs(
  appearance: IconAppearance | undefined,
  style: ResolvedStyle
): Record<string, string | number | undefined> {
  return {
    opacity: appearance?.opacity,
    stroke: appearance?.stroke ?? style.stroke,
    "stroke-width": appearance?.strokeWidth ?? style.strokeWidth,
  };
}

function renderEdge(
  document: DiagramDocument,
  edge: PositionedEdge,
  options: SvgRenderOptions,
  idPrefix: string,
  themeName: string
): RenderedElement {
  const style = resolveStyle(document, edge, options.theme, "edge", themeName);
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
        d: edgePath(edge.waypoints, options.routing),
        fill: "none",
        "marker-end": markerEnd,
        "marker-start": markerStart,
        stroke: style.stroke,
        "stroke-dasharray": style.strokeDasharray,
        "stroke-width": style.strokeWidth,
      },
      selfClosing: true,
    },
  ];
  const labels: SvgLabelSpec[] = [];
  if (edge.label !== undefined) {
    const labelOverflow = edge.labelOverflow ?? document.labelOverflow ?? "wrap";
    const hasLayoutPosition = edge.labelPosition !== undefined;
    const pos = edge.labelPosition ?? midpoint(edge.waypoints);
    const yAdjust = hasLayoutPosition ? style.fontSize * 0.35 : -Math.max(8, style.fontSize * 0.5);
    const theme = resolveTheme(options.theme);
    const edgeLines =
      labelOverflow === "truncate"
        ? [truncateText(edge.label, EDGE_LABEL_MAX_WIDTH, style.fontSize)]
        : wrapText(edge.label, EDGE_LABEL_MAX_WIDTH, style.fontSize);
    const edgeLineHeight = style.fontSize * 1.3;
    labels.push(
      ...edgeLines.map((line, index) =>
        textElement({
          id: stableSvgId(idPrefix, "label", "edge", `${edge.id}-line${index}`),
          ownerId: edge.id,
          label: line,
          x: pos.x,
          y: pos.y + yAdjust + index * edgeLineHeight,
          style,
          anchor: "middle",
          backgroundFill: theme.background,
        })
      )
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

function edgePath(points: Point[], routing?: LayoutRouting): string {
  const [first, ...rest] = points;
  if (first === undefined) {
    return "M 0 0";
  }

  if (routing === "curved" && rest.length >= 2) {
    const last = rest[rest.length - 1];
    if (last === undefined) {
      return `M ${fmt(first.x)} ${fmt(first.y)}`;
    }
    const mid = rest[0];
    if (mid === undefined) {
      return `M ${fmt(first.x)} ${fmt(first.y)} L ${fmt(last.x)} ${fmt(last.y)}`;
    }
    return [
      `M ${fmt(first.x)} ${fmt(first.y)}`,
      `Q ${fmt(mid.x)} ${fmt(mid.y)} ${fmt(last.x)} ${fmt(last.y)}`,
    ].join(" ");
  }

  if (routing === "orthogonal" && rest.length >= 3) {
    const cornerRadius = 8;
    const parts = [`M ${fmt(first.x)} ${fmt(first.y)}`];
    for (let i = 0; i < rest.length; i++) {
      const prev = i === 0 ? first : rest[i - 1];
      const curr = rest[i];
      const next = rest[i + 1];
      if (prev === undefined || curr === undefined) continue;
      if (next !== undefined && isCorner(prev, curr, next)) {
        const before = approachPoint(curr, prev, cornerRadius);
        const after = approachPoint(curr, next, cornerRadius);
        parts.push(`L ${fmt(before.x)} ${fmt(before.y)}`);
        parts.push(`Q ${fmt(curr.x)} ${fmt(curr.y)} ${fmt(after.x)} ${fmt(after.y)}`);
      } else {
        parts.push(`L ${fmt(curr.x)} ${fmt(curr.y)}`);
      }
    }
    return parts.join(" ");
  }

  return [
    `M ${fmt(first.x)} ${fmt(first.y)}`,
    ...rest.map((point) => `L ${fmt(point.x)} ${fmt(point.y)}`),
  ].join(" ");
}

function fmt(value: number): string {
  return formatNumber(value);
}

function isCorner(prev: Point, curr: Point, next: Point): boolean {
  const dx1 = curr.x - prev.x;
  const dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x;
  const dy2 = next.y - curr.y;
  return dx1 * dx2 + dy1 * dy2 === 0;
}

function approachPoint(corner: Point, from: Point, radius: number): Point {
  const dx = corner.x - from.x;
  const dy = corner.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const r = Math.min(radius, len / 2);
  return { x: corner.x - (dx / len) * r, y: corner.y - (dy / len) * r };
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

function renderActivation(
  document: DiagramDocument,
  bar: ActivationBar,
  options: SvgRenderOptions,
  idPrefix: string,
  themeName: string
): SvgElementSpec {
  const proxy = { id: bar.id, kind: "activation" };
  const style = resolveStyle(document, proxy, options.theme, "activation", themeName);
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
  ownerId?: string;
  label: string;
  x: number;
  y: number;
  style: ReturnType<typeof resolveStyle>;
  anchor: "start" | "middle";
  maxWidth?: number;
  clipBounds?: LabelBounds;
  backgroundFill?: string;
  truncate?: boolean;
}

function textElement(options: TextElementOptions): SvgLabelSpec {
  const {
    anchor,
    backgroundFill,
    clipBounds,
    id,
    label,
    maxWidth,
    ownerId,
    style,
    truncate = false,
    x,
    y,
  } = options;
  const constrainedWidth = maxWidth === undefined ? undefined : Math.max(0, maxWidth);
  const displayLabel =
    truncate && constrainedWidth !== undefined
      ? truncateText(label, constrainedWidth, style.fontSize)
      : label;
  const width = measureText(displayLabel, style.fontSize);
  const shouldClip = constrainedWidth !== undefined && width > constrainedWidth;
  let text: SvgElementSpec = {
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
  const bgPadding = backgroundFill === undefined ? 0 : EDGE_LABEL_BG_PADDING;
  const visualTextBounds = labelBounds(x, y, width, style.fontSize, anchor, bgPadding);
  const bgRect: SvgElementSpec | undefined =
    backgroundFill === undefined
      ? undefined
      : {
          name: "rect",
          attrs: {
            fill: backgroundFill,
            height: textBounds.height + bgPadding * 2,
            rx: 3,
            ry: 3,
            width: width + bgPadding * 2,
            x: textBounds.x - bgPadding,
            y: textBounds.y - bgPadding,
          },
          selfClosing: true,
        };
  if (!shouldClip && bgRect === undefined) {
    return {
      id,
      ...(ownerId === undefined ? {} : { ownerId }),
      element: text,
      bounds: visualTextBounds,
    };
  }
  const bounds = clipBounds ?? textBounds;
  const children: SvgElementSpec[] = [];
  if (shouldClip) {
    children.push({
      name: "clipPath",
      attrs: { id: stableSvgId(id, "clip") },
      children: [
        {
          name: "rect",
          attrs: {
            height: bounds.height + bgPadding * 2,
            width: bounds.width + bgPadding * 2,
            x: bounds.x - bgPadding,
            y: bounds.y - bgPadding,
          },
          selfClosing: true,
        },
      ],
    });
    text = { ...text, attrs: { ...text.attrs, "clip-path": `url(#${stableSvgId(id, "clip")})` } };
  }
  if (bgRect !== undefined) {
    children.push(bgRect);
  }
  children.push(text);

  return {
    id,
    ...(ownerId === undefined ? {} : { ownerId }),
    element: {
      name: "g",
      attrs: { id: stableSvgId(id, shouldClip ? "clipped" : "bg") },
      children,
    },
    bounds: intersectBounds(visualTextBounds, expandBounds(bounds, bgPadding)),
  };
}

function expandBounds(bounds: LabelBounds, padding: number): LabelBounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function labelBounds(
  x: number,
  y: number,
  width: number,
  fontSize: number,
  anchor: "start" | "middle",
  padding = 0
): LabelBounds {
  const left = anchor === "middle" ? x - width / 2 : x;
  return {
    x: left - padding,
    y: y - fontSize * 0.8 - padding,
    width: width + padding * 2,
    height: fontSize + padding * 2,
  };
}

function intersectBounds(left: LabelBounds, right: LabelBounds): LabelBounds {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const maxX = Math.min(left.x + left.width, right.x + right.width);
  const maxY = Math.min(left.y + left.height, right.y + right.height);
  return { x, y, width: Math.max(0, maxX - x), height: Math.max(0, maxY - y) };
}

function avoidLabelOverlaps(
  labels: readonly SvgLabelSpec[],
  occlusionRects: readonly OcclusionRect[] = [],
  groupBounds: readonly OcclusionRect[] = []
): SvgLabelSpec[] {
  const placed: SvgLabelSpec[] = [];
  const adjusted: SvgLabelSpec[] = [];
  for (const label of [...labels].sort((left, right) => compareStable(left.id, right.id))) {
    let bounds = { ...label.bounds };
    let offsetX = 0;
    let offsetY = 0;
    const containingGroup = findContainingGroup(label.bounds, groupBounds);
    if (isStructuralLabel(label)) {
      placed.push(label);
      adjusted.push(label);
      continue;
    }
    for (const previous of placed) {
      if (shouldSkipStructuralLabelOverlap(label, previous, containingGroup)) {
        continue;
      }
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
    for (const rect of occlusionRects) {
      if (
        rect.id === label.ownerId ||
        rect.id === containingGroup?.id ||
        startedInsideGroup(label.bounds, rect, groupBounds) ||
        !boundsOverlap(bounds, rect, 2)
      ) {
        continue;
      }
      const shiftY = rect.y + rect.height - bounds.y + 2;
      offsetY += shiftY;
      bounds = { ...bounds, y: bounds.y + shiftY };
      if (boundsOverlap(bounds, rect, 2)) {
        offsetX += rect.x + rect.width - bounds.x + 2;
        bounds = { ...bounds, x: bounds.x + offsetX };
      }
    }
    if (containingGroup !== undefined) {
      const clamped = clampBoundsToRect(bounds, containingGroup);
      offsetX += clamped.x - bounds.x;
      offsetY += clamped.y - bounds.y;
      bounds = clamped;
    }
    const element =
      offsetX === 0 && offsetY === 0
        ? label.element
        : withTransform(
            label.element,
            `translate(${formatNumber(offsetX)} ${formatNumber(offsetY)})`
          );
    const shifted = { ...label, element, bounds };
    placed.push(shifted);
    adjusted.push(shifted);
  }
  return adjusted;
}

function findContainingGroup(
  bounds: LabelBounds,
  groupBounds: readonly OcclusionRect[]
): OcclusionRect | undefined {
  const containingGroups = groupBounds.filter((group) => boundsCenterInside(bounds, group));
  return containingGroups.sort(
    (left, right) =>
      left.width * left.height - right.width * right.height || compareStable(left.id, right.id)
  )[0];
}

function boundsCenterInside(bounds: LabelBounds, rect: OcclusionRect): boolean {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return (
    centerX >= rect.x &&
    centerX <= rect.x + rect.width &&
    centerY >= rect.y &&
    centerY <= rect.y + rect.height
  );
}

function shouldSkipStructuralLabelOverlap(
  label: SvgLabelSpec,
  previous: SvgLabelSpec,
  containingGroup: OcclusionRect | undefined
): boolean {
  return (
    containingGroup !== undefined &&
    label.id.includes("-label-edge-") &&
    isStructuralLabel(previous)
  );
}

function isStructuralLabel(label: SvgLabelSpec): boolean {
  return label.id.includes("-label-group-") || label.id.includes("-label-lane-");
}

function startedInsideGroup(
  bounds: LabelBounds,
  rect: OcclusionRect,
  groupBounds: readonly OcclusionRect[]
): boolean {
  return groupBounds.some((group) => group.id === rect.id && boundsCenterInside(bounds, group));
}

function clampBoundsToRect(bounds: LabelBounds, rect: OcclusionRect): LabelBounds {
  return {
    ...bounds,
    x: clamp(bounds.x, rect.x, rect.x + Math.max(0, rect.width - bounds.width)),
    y: clamp(bounds.y, rect.y, rect.y + Math.max(0, rect.height - bounds.height)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
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
