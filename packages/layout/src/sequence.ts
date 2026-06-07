import type { LabelOverflow } from "@drawspec/core";
import {
  truncateText,
  truncateTextContent,
  wrapText,
  wrapTextContent,
} from "@drawspec/text-measure";
import { LayoutCache } from "./cache";
import { normalizeLayoutOptions } from "./options";
import { sizeNode } from "./sizing";
import type {
  ActivationBar,
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  LabelLine,
  LayoutEngine,
  LayoutOptions,
  NodeContentLayout,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedGroup,
  PositionedGroupLane,
  PositionedNode,
} from "./types";

interface SequenceOperand {
  condition?: unknown;
  childIds?: unknown;
}

interface SizedSequenceNode extends DiagramNode {
  computedWidth: number;
  computedHeight: number;
  labelLines: LabelLine[];
  contentLayout: NodeContentLayout;
}

const SEQUENCE_LABEL_MAX_WIDTH = 240;

function nodeCenter(node: PositionedNode): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function sizeSequenceNodes(document: DiagramDocument, options: LayoutOptions): SizedSequenceNode[] {
  const normalized = normalizeLayoutOptions(document, options);
  const maxWidth = Math.max(
    normalized.nodeSize.width,
    normalized.sizing.maxSize.width === Infinity
      ? SEQUENCE_LABEL_MAX_WIDTH
      : normalized.sizing.maxSize.width
  );

  return document.nodes.map((node) =>
    sizeNode(node, {
      ...normalized.sizing,
      mode: "auto",
      defaultSize: normalized.nodeSize,
      maxSize: { ...normalized.sizing.maxSize, width: maxWidth },
      labelWrap: "auto",
    })
  );
}

function positionLifelines(document: DiagramDocument, options: LayoutOptions): PositionedNode[] {
  const normalized = normalizeLayoutOptions(document, options);
  const sizedNodes = sizeSequenceNodes(document, options);
  const lifelineGap = Math.max(0, normalized.spacing.lifeline - normalized.nodeSize.width);
  let nextX = normalized.padding;

  return sizedNodes.map((node) => {
    const x = nextX;
    nextX += node.computedWidth + lifelineGap;
    return {
      ...node,
      x,
      y: normalized.padding,
      width: node.computedWidth,
      height: node.computedHeight,
      labelLines: node.labelLines,
      contentLayout: node.contentLayout,
    };
  });
}

function messageY(
  index: number,
  headerHeight: number,
  document: DiagramDocument,
  options: LayoutOptions
): number {
  const normalized = normalizeLayoutOptions(document, options);
  return normalized.padding + headerHeight + normalized.spacing.message * (index + 1);
}

function sequenceWaypoints(
  edge: DiagramEdge,
  edgeIndex: number,
  headerHeight: number,
  document: DiagramDocument,
  nodesById: Record<string, PositionedNode>,
  options: LayoutOptions
): Point[] {
  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];

  if (source === undefined || target === undefined) {
    return [];
  }

  const y = messageY(edgeIndex, headerHeight, document, options);
  const sourceCenter = nodeCenter(source);
  const targetCenter = nodeCenter(target);
  if (edge.sourceId === edge.targetId) {
    const loopX = sourceCenter.x + source.width / 2 + 32;
    return [
      { x: sourceCenter.x, y },
      { x: loopX, y },
      { x: loopX, y: y + 24 },
      { x: sourceCenter.x, y: y + 24 },
    ];
  }

  return [
    { x: sourceCenter.x, y },
    { x: targetCenter.x, y },
  ];
}

function positionMessages(
  document: DiagramDocument,
  nodesById: Record<string, PositionedNode>,
  headerHeight: number,
  options: LayoutOptions
): PositionedEdge[] {
  return document.edges.map((edge, index) => ({
    ...edge,
    waypoints: sequenceWaypoints(edge, index, headerHeight, document, nodesById, options),
  }));
}

function childIdsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function operandsOf(group: DiagramGroup): SequenceOperand[] {
  const metadata = group.metadata as { operands?: unknown } | undefined;
  const operands = metadata?.operands;
  if (!Array.isArray(operands)) {
    return [];
  }

  return operands.filter(
    (operand): operand is SequenceOperand => typeof operand === "object" && operand !== null
  );
}

function edgeYRange(
  childIds: string[],
  edgesById: Record<string, PositionedEdge>
): { top: number; bottom: number } | undefined {
  const ys = childIds
    .map((id) => edgesById[id]?.waypoints[0]?.y)
    .filter((y): y is number => typeof y === "number")
    .sort((left, right) => left - right);

  const top = ys[0];
  const bottom = ys[ys.length - 1];
  if (top === undefined || bottom === undefined) {
    return undefined;
  }

  return { top, bottom };
}

function groupXBounds(
  childIds: string[],
  edgesById: Record<string, PositionedEdge>,
  nodesById: Record<string, PositionedNode>
): { x: number; width: number } {
  const nodeBounds = childIds
    .flatMap((id) => {
      const edge = edgesById[id];
      if (edge === undefined) {
        return [];
      }
      return [nodesById[edge.sourceId], nodesById[edge.targetId]].filter(
        (node): node is PositionedNode => node !== undefined
      );
    })
    .sort((left, right) => left.x - right.x);

  const first = nodeBounds[0];
  const last = nodeBounds[nodeBounds.length - 1] ?? first;
  const x = first?.x ?? 0;
  const right = last === undefined ? x : last.x + last.width;
  return { x: x - 24, width: right - x + 48 };
}

function positionedLane(
  id: string,
  operand: SequenceOperand,
  y: number,
  x: number,
  width: number,
  height: number,
  labelOverflow: LabelOverflow
): PositionedGroupLane {
  const childIds = childIdsFrom(operand.childIds);
  const lane: PositionedGroupLane = { id, x, y, width, height, childIds };
  if (typeof operand.condition === "string") {
    lane.label = operand.condition;
    if (labelOverflow === "truncate") {
      lane.labelLines = [truncateText(operand.condition, width - 16, 14)];
    } else {
      lane.labelLines = wrapText(operand.condition, width - 16, 14);
    }
  }
  return lane;
}

function positionGroups(
  document: DiagramDocument,
  edges: PositionedEdge[],
  nodesById: Record<string, PositionedNode>,
  headerHeight: number,
  options: LayoutOptions
): PositionedGroup[] {
  const normalized = normalizeLayoutOptions(document, options);
  const labelOverflow = document.labelOverflow ?? "wrap";
  const edgesById: Record<string, PositionedEdge> = {};
  for (const edge of edges) {
    edgesById[edge.id] = edge;
  }

  return document.groups.map((group) => {
    const groupOverflow = group.labelOverflow ?? labelOverflow;
    const childIds = childIdsFrom(group.childIds);
    const bounds = edgeYRange(childIds, edgesById);
    const xBounds = groupXBounds(childIds, edgesById, nodesById);
    const top = (bounds?.top ?? normalized.padding + headerHeight) - normalized.spacing.message / 2;
    const bottom = (bounds?.bottom ?? top) + normalized.spacing.message / 2;
    const operands = operandsOf(group);
    const laneHeight = operands.length > 0 ? (bottom - top) / operands.length : bottom - top;
    const lanes = operands.map((operand, index) =>
      positionedLane(
        `${group.id}:operand:${index}`,
        operand,
        top + laneHeight * index,
        xBounds.x,
        xBounds.width,
        laneHeight,
        groupOverflow
      )
    );

    const groupLabelLines =
      group.label !== undefined
        ? groupOverflow === "truncate"
          ? [truncateTextContent(group.label, xBounds.width - 24, 14)]
          : wrapTextContent(group.label, xBounds.width - 24, 14)
        : undefined;

    return {
      ...group,
      x: xBounds.x,
      y: top,
      width: xBounds.width,
      height: bottom - top,
      lanes,
      ...(groupLabelLines !== undefined && { labelLines: groupLabelLines }),
    };
  });
}

function activationsFor(
  document: DiagramDocument,
  nodesById: Record<string, PositionedNode>,
  headerHeight: number,
  options: LayoutOptions
): ActivationBar[] {
  const normalized = normalizeLayoutOptions(document, options);
  return document.edges
    .map((edge, index): ActivationBar | undefined => {
      const target = nodesById[edge.targetId];
      if (target === undefined || edge.sourceId === edge.targetId) {
        return undefined;
      }

      const y = messageY(index, headerHeight, document, options) + 4;
      return {
        id: `${edge.id}:activation`,
        nodeId: edge.targetId,
        edgeId: edge.id,
        x: nodeCenter(target).x - 5,
        y,
        width: 10,
        height: Math.max(24, normalized.spacing.message - 8),
      };
    })
    .filter((activation): activation is ActivationBar => activation !== undefined);
}

function createSequenceLayout(
  document: DiagramDocument,
  options: LayoutOptions = {}
): PositionedDiagram {
  const normalized = normalizeLayoutOptions(document, options);
  const nodes = positionLifelines(document, options);
  const headerHeight = Math.max(normalized.nodeSize.height, ...nodes.map((node) => node.height));
  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const edges = positionMessages(document, nodesById, headerHeight, options);
  const groups = positionGroups(document, edges, nodesById, headerHeight, options);
  const activations = activationsFor(document, nodesById, headerHeight, options);
  const maxNodeX = Math.max(0, ...nodes.map((node) => node.x + node.width));
  const maxMessageY =
    document.edges.length === 0
      ? normalized.padding
      : messageY(document.edges.length - 1, headerHeight, document, options);
  const maxGroupBottom = Math.max(0, ...groups.map((group) => group.y + group.height));
  const width =
    Math.max(maxNodeX, ...groups.map((group) => group.x + group.width), normalized.padding) +
    normalized.padding;
  const height =
    Math.max(maxMessageY, maxGroupBottom, normalized.padding + headerHeight) + normalized.padding;

  return { document, nodes, edges, groups, activations, width, height };
}

export class SequenceLayoutEngine implements LayoutEngine {
  readonly name = "sequence";
  readonly #cache = new LayoutCache();

  supports(document: DiagramDocument): boolean {
    return document.kind === "sequence";
  }

  async layout(document: DiagramDocument, options: LayoutOptions = {}): Promise<PositionedDiagram> {
    const cached = this.#cache.get(document, options);
    if (cached !== undefined) {
      return cached;
    }

    const positioned = createSequenceLayout(document, options);
    this.#cache.set(document, options, positioned);
    return positioned;
  }
}

export function sequenceLayout(): SequenceLayoutEngine {
  return new SequenceLayoutEngine();
}
