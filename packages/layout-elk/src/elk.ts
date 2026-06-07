import type { DiagramDocument, DiagramEdge, DiagramNode } from "@drawspec/core";
import { labelToPlainText } from "@drawspec/core";
import type {
  LayoutEngine,
  LayoutOptions,
  NormalizedLayoutOptions,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedNode,
} from "@drawspec/layout";
import { LayoutCache, normalizeLayoutOptions, sizeGraphNodes } from "@drawspec/layout";
import { measureTextContent } from "@drawspec/text-measure";
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api";
import ELKConstructor from "elkjs/lib/elk-api.js";

const EDGE_LABEL_FONT_SIZE = 14;
const EDGE_LABEL_HORIZONTAL_PADDING = 8;
const EDGE_LABEL_VERTICAL_PADDING = 4;

const ELK_DIRECTION_MAP: Record<string, string> = {
  TB: "DOWN",
  BT: "UP",
  LR: "RIGHT",
  RL: "LEFT",
};

function sortedNodes(document: DiagramDocument): DiagramNode[] {
  return [...document.nodes].sort((a, b) => a.id.localeCompare(b.id));
}

function sortedEdges(document: DiagramDocument): DiagramEdge[] {
  return [...document.edges].sort((a, b) => a.id.localeCompare(b.id));
}

let elkInstance: InstanceType<typeof ELKConstructor> | undefined;

function getElkInstance(): InstanceType<typeof ELKConstructor> {
  if (elkInstance !== undefined) return elkInstance;
  const req = import.meta.require as (id: string) => unknown & { resolve(id: string): string };
  req("elkjs/lib/elk-worker.js");
  const FakeWorker = (globalThis as Record<string, unknown>)["Worker"] as new (
    url: string
  ) => unknown;
  const workerPath = (import.meta.require as { resolve(id: string): string }).resolve(
    "elkjs/lib/elk-worker.js"
  );

  elkInstance = new ELKConstructor({
    workerFactory: () => new FakeWorker(workerPath),
  });
  return elkInstance;
}

function buildElkGraph(document: DiagramDocument, normalized: NormalizedLayoutOptions): ElkNode {
  const sizedNodes = sizeGraphNodes(sortedNodes(document), normalized.sizing);
  const children: ElkNode[] = sizedNodes.map((node) => ({
    id: node.id,
    width: node.computedWidth,
    height: node.computedHeight,
  }));

  const edges: ElkExtendedEdge[] = sortedEdges(document)
    .filter(
      (edge) =>
        edge.sourceId !== edge.targetId &&
        document.nodes.some((n: DiagramNode) => n.id === edge.sourceId) &&
        document.nodes.some((n: DiagramNode) => n.id === edge.targetId)
    )
    .map((edge) => {
      const elkEdge: ElkExtendedEdge = {
        id: edge.id,
        sources: [edge.sourceId],
        targets: [edge.targetId],
      };

      if (edge.label !== undefined) {
        elkEdge.labels = [
          {
            text: labelToPlainText(edge.label),
            width:
              measureTextContent(edge.label, EDGE_LABEL_FONT_SIZE) + EDGE_LABEL_HORIZONTAL_PADDING,
            height: EDGE_LABEL_FONT_SIZE * 1.2 + EDGE_LABEL_VERTICAL_PADDING,
          },
        ];
      }

      return elkEdge;
    });

  const elkDirection = ELK_DIRECTION_MAP[normalized.direction] ?? "DOWN";

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection,
      "elk.spacing.nodeNode": String(normalized.spacing.node),
      "elk.layerSpacing.node1": String(normalized.spacing.rank),
      "elk.padding": `[top=${normalized.padding},left=${normalized.padding},bottom=${normalized.padding},right=${normalized.padding}]`,
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.crossingMinimization.semiInteractive": "true",
      "elk.edgeLabels.inline": "true",
    },
    children,
    edges,
  };
}

function positionNodes(
  document: DiagramDocument,
  normalized: NormalizedLayoutOptions,
  elkResult: ElkNode
): PositionedNode[] {
  const sizedNodesById = new Map(
    sizeGraphNodes(sortedNodes(document), normalized.sizing).map((node) => [node.id, node])
  );
  const elkNodesById: Record<string, ElkNode> = {};
  for (const child of elkResult.children ?? []) {
    elkNodesById[child.id] = child;
  }

  return sortedNodes(document).map((node) => {
    const sizedNode = sizedNodesById.get(node.id);
    const elkNode = elkNodesById[node.id];
    if (elkNode === undefined || elkNode.x === undefined || elkNode.y === undefined) {
      return {
        ...(sizedNode ?? node),
        x: normalized.padding,
        y: normalized.padding,
        width: sizedNode?.computedWidth ?? normalized.nodeSize.width,
        height: sizedNode?.computedHeight ?? normalized.nodeSize.height,
      };
    }
    return {
      ...(sizedNode ?? node),
      x: elkNode.x,
      y: elkNode.y,
      width: elkNode.width ?? sizedNode?.computedWidth ?? normalized.nodeSize.width,
      height: elkNode.height ?? sizedNode?.computedHeight ?? normalized.nodeSize.height,
    };
  });
}

function edgeWaypoints(
  edge: DiagramEdge,
  nodesById: Record<string, PositionedNode>,
  elkEdgesById: Record<string, ElkExtendedEdge>
): Point[] {
  if (edge.sourceId === edge.targetId) {
    const source = nodesById[edge.sourceId];
    if (source === undefined) return [];
    const cx = source.x + source.width / 2;
    const cy = source.y + source.height / 2;
    return [
      { x: cx, y: cy },
      { x: source.x + source.width + 28, y: cy },
      { x: source.x + source.width + 28, y: source.y - 28 },
      { x: cx, y: source.y - 28 },
      { x: cx, y: cy },
    ];
  }

  const elkEdge = elkEdgesById[edge.id];
  const firstSection = elkEdge?.sections?.[0];
  if (firstSection !== undefined) {
    const points: Point[] = [{ x: firstSection.startPoint.x, y: firstSection.startPoint.y }];
    for (const bp of firstSection.bendPoints ?? []) {
      points.push({ x: bp.x, y: bp.y });
    }
    points.push({ x: firstSection.endPoint.x, y: firstSection.endPoint.y });
    return points.map((p) => ({
      x: Math.round(p.x * 1000) / 1000,
      y: Math.round(p.y * 1000) / 1000,
    }));
  }

  const source = nodesById[edge.sourceId];
  const target = nodesById[edge.targetId];
  if (source === undefined || target === undefined) return [];
  return [
    { x: source.x + source.width / 2, y: source.y + source.height / 2 },
    { x: target.x + target.width / 2, y: target.y + target.height / 2 },
  ];
}

function edgeLabelPosition(
  edge: DiagramEdge,
  elkEdge: ElkExtendedEdge | undefined
): Point | undefined {
  if (edge.label === undefined) {
    return undefined;
  }

  const elkLabel = elkEdge?.labels?.[0];
  if (elkLabel?.x === undefined || elkLabel.y === undefined) {
    return undefined;
  }

  return {
    x: Math.round((elkLabel.x + (elkLabel.width ?? 0) / 2) * 1000) / 1000,
    y: Math.round((elkLabel.y + (elkLabel.height ?? 0) / 2) * 1000) / 1000,
  };
}

function computeBounds(
  nodes: PositionedNode[],
  edges: PositionedEdge[],
  padding: number
): { width: number; height: number } {
  const allX: number[] = [];
  const allY: number[] = [];

  for (const node of nodes) {
    allX.push(node.x + node.width);
    allY.push(node.y + node.height);
  }

  for (const edge of edges) {
    for (const wp of edge.waypoints) {
      allX.push(wp.x);
      allY.push(wp.y);
    }
    if (edge.label !== undefined && edge.labelPosition !== undefined) {
      allX.push(edge.labelPosition.x + measureTextContent(edge.label, EDGE_LABEL_FONT_SIZE) / 2);
      allY.push(edge.labelPosition.y + (EDGE_LABEL_FONT_SIZE * 1.2) / 2);
    }
  }

  return {
    width: Math.max(padding * 2, ...allX) + padding,
    height: Math.max(padding * 2, ...allY) + padding,
  };
}

async function createElkLayout(
  document: DiagramDocument,
  options: LayoutOptions = {}
): Promise<PositionedDiagram> {
  const normalized = normalizeLayoutOptions(document, options);

  if (document.nodes.length === 0) {
    return {
      document,
      nodes: [],
      edges: [],
      groups: [],
      activations: [],
      width: normalized.padding * 2,
      height: normalized.padding * 2,
    };
  }

  const elkGraph = buildElkGraph(document, normalized);
  const elk = getElkInstance();
  const elkResult = await elk.layout(elkGraph);

  const nodes = positionNodes(document, normalized, elkResult);
  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) {
    nodesById[node.id] = node;
  }

  const elkEdgesById: Record<string, ElkExtendedEdge> = {};
  for (const e of elkResult.edges ?? []) {
    elkEdgesById[e.id] = e;
  }

  const edges: PositionedEdge[] = sortedEdges(document).map((edge) => {
    const elkEdge = elkEdgesById[edge.id];
    const labelPosition = edgeLabelPosition(edge, elkEdge);
    return {
      ...edge,
      waypoints: edgeWaypoints(edge, nodesById, elkEdgesById),
      ...(labelPosition === undefined ? {} : { labelPosition }),
    };
  });

  const { width, height } = computeBounds(nodes, edges, normalized.padding);

  return { document, nodes, edges, groups: [], activations: [], width, height };
}

export class ElkLayoutEngine implements LayoutEngine {
  readonly name = "elk";
  readonly #cache = new LayoutCache();

  supports(document: DiagramDocument): boolean {
    return document.kind !== "sequence";
  }

  async layout(document: DiagramDocument, options: LayoutOptions = {}): Promise<PositionedDiagram> {
    const cached = this.#cache.get(document, options);
    if (cached !== undefined) {
      return cached;
    }

    const positioned = await createElkLayout(document, options);
    this.#cache.set(document, options, positioned);
    return positioned;
  }
}

export function elkLayout(): ElkLayoutEngine {
  return new ElkLayoutEngine();
}
