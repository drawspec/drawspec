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
import type { Renderer, SvgOutput, SvgRenderOptions } from "./types";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

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
  const { positionedDiagram } = options;
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
  const markerId = stableSvgId(idPrefix, "marker", "arrow");
  const labels: SvgElementSpec[] = [];
  const children: SvgElementSpec[] = [
    { name: "title", attrs: { id: stableSvgId(idPrefix, "title") }, children: [title] },
    { name: "desc", attrs: { id: stableSvgId(idPrefix, "desc") }, children: [description] },
    renderBackground(width, height, theme.background),
    renderDefs(markerId, theme.edgeStroke),
    ...sortById(positionedDiagram.groups).map((group) => {
      const result = renderGroup(document, group, options, idPrefix);
      labels.push(...result.labels);
      return result.element;
    }),
    ...sortById(positionedDiagram.edges).map((edge) => {
      const result = renderEdge(document, edge, options, idPrefix, markerId);
      labels.push(...result.labels);
      return result.element;
    }),
    ...sortById(positionedDiagram.nodes).map((node) => {
      const result = renderNode(document, node, options, idPrefix);
      labels.push(...result.labels);
      return result.element;
    }),
    ...sortById(positionedDiagram.activations).map((bar) =>
      renderActivation(document, bar, options, idPrefix)
    ),
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

function renderDefs(markerId: string, stroke: string): SvgElementSpec {
  return {
    name: "defs",
    children: [
      {
        name: "marker",
        attrs: {
          id: markerId,
          markerHeight: 8,
          markerWidth: 8,
          orient: "auto",
          refX: 8,
          refY: 4,
          viewBox: "0 0 8 8",
        },
        children: [
          { name: "path", attrs: { d: "M 0 0 L 8 4 L 0 8 z", fill: stroke }, selfClosing: true },
        ],
      },
    ],
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
  idPrefix: string,
  markerId: string
): RenderedElement {
  const style = resolveStyle(document, edge, options.theme, "edge");
  const direction = edge.direction ?? "forward";
  const children: SvgElementSpec[] = [
    {
      name: "path",
      attrs: {
        d: edgePath(edge.waypoints),
        fill: "none",
        "marker-end":
          direction === "forward" || direction === "bidirectional"
            ? `url(#${markerId})`
            : undefined,
        "marker-start":
          direction === "backward" || direction === "bidirectional"
            ? `url(#${markerId})`
            : undefined,
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
