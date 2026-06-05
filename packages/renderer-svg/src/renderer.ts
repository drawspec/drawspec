import type { DiagramDocument, SourceRef } from "@drawspec/core";
import type {
  ActivationBar,
  Point,
  PositionedEdge,
  PositionedGroup,
  PositionedNode,
} from "@drawspec/layout";
import { defaultTheme, resolveStyle } from "./styles";
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
  const theme = { ...defaultTheme, ...options.theme };
  const width = options.width ?? positionedDiagram.width;
  const height = options.height ?? positionedDiagram.height;
  const idPrefix = stableSvgId("drawspec", document.id);
  const title = options.accessibility?.title ?? document.title ?? document.id;
  const metadata = document.metadata as { description?: unknown } | undefined;
  const metadataDescription = metadata?.description;
  const description =
    options.accessibility?.description ??
    (typeof metadataDescription === "string"
      ? metadataDescription
      : `${document.kind} diagram ${document.id}`);
  const labels: SvgElementSpec[] = [];
  const children: SvgElementSpec[] = [
    { name: "title", attrs: { id: stableSvgId(idPrefix, "title") }, children: [title] },
    { name: "desc", attrs: { id: stableSvgId(idPrefix, "desc") }, children: [description] },
    renderBackground(width, height, theme.background),
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
    children.push({
      name: "g",
      attrs: { id: stableSvgId(idPrefix, "text-layer") },
      children: labels,
    });
  }
  const svg = renderElement({
    name: "svg",
    attrs: {
      "aria-describedby": stableSvgId(idPrefix, "desc"),
      "aria-labelledby": stableSvgId(idPrefix, "title"),
      height,
      id: idPrefix,
      role: options.accessibility?.role ?? "img",
      viewBox: `0 0 ${formatNumber(width)} ${formatNumber(height)}`,
      width,
      xmlns: "http://www.w3.org/2000/svg",
    },
    children,
  });
  return `${XML_DECLARATION}\n${svg}\n`;
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

function renderBackground(width: number, height: number, fill: string): SvgElementSpec {
  return {
    name: "rect",
    attrs: { fill, height, width, x: 0, y: 0 },
    selfClosing: true,
  };
}

interface RenderedElement {
  element: SvgElementSpec;
  labels: SvgElementSpec[];
}

function renderGroup(
  document: DiagramDocument,
  group: PositionedGroup,
  options: SvgRenderOptions,
  idPrefix: string
): RenderedElement {
  const style = resolveStyle(document, group, options.theme, "group");
  const labels: SvgElementSpec[] = [];
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
    labels.push(textElement(group.label, group.x + 12, group.y + 20, style, "start"));
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
      labels.push(textElement(lane.label, lane.x + 8, lane.y + 18, style, "start"));
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
  const labels: SvgElementSpec[] = [
    textElement(
      label,
      node.x + node.width / 2,
      node.y + node.height / 2 + style.fontSize / 3,
      style,
      "middle"
    ),
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
  const labels: SvgElementSpec[] = [];
  if (edge.label !== undefined) {
    const mid = midpoint(edge.waypoints);
    labels.push(textElement(edge.label, mid.x, mid.y - 6, style, "middle"));
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

function textElement(
  label: string,
  x: number,
  y: number,
  style: ReturnType<typeof resolveStyle>,
  anchor: "start" | "middle"
): SvgElementSpec {
  const width = measureText(label, style.fontSize);
  return {
    name: "text",
    attrs: {
      "data-width": width,
      fill: style.text,
      "font-family": style.fontFamily,
      "font-size": style.fontSize,
      "text-anchor": anchor,
      x,
      y,
    },
    children: [label],
  };
}
