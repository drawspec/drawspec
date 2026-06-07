import type { DiagramDocument } from "@drawspec/core";
import type {
  LayoutDirection,
  LayoutEngine,
  LayoutOptions,
  PositionedDiagram,
  PositionedEdge,
  PositionedNode,
} from "@drawspec/layout";
import {
  computeBounds,
  edgeWaypoints,
  LayoutCache,
  normalizeLayoutOptions,
  round,
  sizeGraphNodes,
  sortedEdges,
  sortedNodes,
  validGraphEdges,
} from "@drawspec/layout";

/** Configuration for deterministic tree layout. */
export interface TreeOptions {
  /** Space between sibling subtree centers. Default: layout node spacing. */
  nodeSpacing?: number;
  /** Space between tree levels. Default: layout rank spacing. */
  levelSpacing?: number;
  /** Direction in which tree levels progress. Default: layout direction. */
  direction?: LayoutDirection;
}

/** Layout options accepted by {@link TreeLayoutEngine}. */
export interface TreeLayoutOptions extends LayoutOptions {
  /** Tree-specific spacing and direction options. */
  tree?: TreeOptions;
}

interface SizedTreeNode extends PositionedNode {
  depth: number;
  breadth: number;
}

interface TreeNode {
  id: string;
  children: TreeNode[];
}

function adjacencyFor(document: DiagramDocument): Map<string, string[]> {
  const adjacency = new Map(sortedNodes(document).map((node) => [node.id, [] as string[]]));
  for (const edge of validGraphEdges(document)) {
    const children = adjacency.get(edge.sourceId) ?? [];
    if (!children.includes(edge.targetId)) children.push(edge.targetId);
    adjacency.set(
      edge.sourceId,
      children.sort((left, right) => left.localeCompare(right))
    );
  }
  return adjacency;
}

function rootIdsFor(document: DiagramDocument): string[] {
  const incoming = new Set(validGraphEdges(document).map((edge) => edge.targetId));
  const roots = sortedNodes(document)
    .map((node) => node.id)
    .filter((id) => !incoming.has(id));
  return roots.length > 0 ? roots : sortedNodes(document).map((node) => node.id);
}

function buildForest(document: DiagramDocument): TreeNode[] {
  const adjacency = adjacencyFor(document);
  const visited = new Set<string>();

  const visit = (id: string, ancestors: Set<string>): TreeNode => {
    visited.add(id);
    const nextAncestors = new Set(ancestors).add(id);
    const children = (adjacency.get(id) ?? [])
      .filter((childId) => !nextAncestors.has(childId) && !visited.has(childId))
      .map((childId) => visit(childId, nextAncestors));
    return { id, children };
  };

  const forest = rootIdsFor(document)
    .filter((id) => !visited.has(id))
    .map((id) => visit(id, new Set<string>()));

  for (const node of sortedNodes(document)) {
    if (!visited.has(node.id)) forest.push(visit(node.id, new Set<string>()));
  }

  return forest;
}

function assignBreadth(
  node: TreeNode,
  depth: number,
  nextLeaf: { value: number },
  positions: Map<string, { depth: number; breadth: number }>
): number {
  if (node.children.length === 0) {
    const breadth = nextLeaf.value;
    nextLeaf.value += 1;
    positions.set(node.id, { depth, breadth });
    return breadth;
  }

  const childBreadths = node.children.map((child) =>
    assignBreadth(child, depth + 1, nextLeaf, positions)
  );
  const first = childBreadths[0] ?? nextLeaf.value;
  const last = childBreadths[childBreadths.length - 1] ?? first;
  const breadth = (first + last) / 2;
  positions.set(node.id, { depth, breadth });
  return breadth;
}

function treePositions(document: DiagramDocument): Map<string, { depth: number; breadth: number }> {
  const positions = new Map<string, { depth: number; breadth: number }>();
  const nextLeaf = { value: 0 };
  for (const root of buildForest(document)) {
    assignBreadth(root, 0, nextLeaf, positions);
    nextLeaf.value += 1;
  }
  return positions;
}

function orientNode(
  node: SizedTreeNode,
  direction: LayoutDirection,
  maxDepth: number,
  maxBreadth: number,
  levelSpacing: number,
  nodeSpacing: number,
  padding: number
): PositionedNode {
  const depth = direction === "BT" || direction === "RL" ? maxDepth - node.depth : node.depth;
  const breadth =
    direction === "RL" || direction === "BT" ? maxBreadth - node.breadth : node.breadth;
  const primary =
    padding +
    depth * (levelSpacing + (direction === "LR" || direction === "RL" ? node.width : node.height));
  const secondary =
    padding +
    breadth * (nodeSpacing + (direction === "LR" || direction === "RL" ? node.height : node.width));
  return {
    ...node,
    x: round(direction === "LR" || direction === "RL" ? primary : secondary),
    y: round(direction === "LR" || direction === "RL" ? secondary : primary),
  };
}

function positionNodes(document: DiagramDocument, options: TreeLayoutOptions): PositionedNode[] {
  const normalized = normalizeLayoutOptions(document, options);
  const positions = treePositions(document);
  const sizedNodes = sizeGraphNodes(sortedNodes(document), normalized.sizing);
  const direction = options.tree?.direction ?? normalized.direction;
  const nodeSpacing = options.tree?.nodeSpacing ?? normalized.spacing.node;
  const levelSpacing = options.tree?.levelSpacing ?? normalized.spacing.rank;
  const positionValues = [...positions.values()];
  const maxDepth = Math.max(0, ...positionValues.map((position) => position.depth));
  const maxBreadth = Math.max(0, ...positionValues.map((position) => position.breadth));

  return sizedNodes.map((node) => {
    const position = positions.get(node.id) ?? { depth: 0, breadth: 0 };
    return orientNode(
      {
        ...node,
        width: node.computedWidth,
        height: node.computedHeight,
        depth: position.depth,
        breadth: position.breadth,
        x: 0,
        y: 0,
      },
      direction,
      maxDepth,
      maxBreadth,
      levelSpacing,
      nodeSpacing,
      normalized.padding
    );
  });
}

function createTreeLayout(
  document: DiagramDocument,
  options: TreeLayoutOptions = {}
): PositionedDiagram {
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

  const nodes = positionNodes(document, options);
  const nodesById: Record<string, PositionedNode> = {};
  for (const node of nodes) nodesById[node.id] = node;
  const edges: PositionedEdge[] = sortedEdges(document).map((edge) => ({
    ...edge,
    waypoints: edgeWaypoints(edge, nodesById),
  }));
  const { width, height } = computeBounds(nodes, edges, normalized.padding);
  return { document, nodes, edges, groups: [], activations: [], width, height };
}

/** Deterministic rooted-forest tree layout engine. */
export class TreeLayoutEngine implements LayoutEngine {
  /** Stable engine name used by registries and diagnostics. */
  readonly name = "tree";
  readonly #cache = new LayoutCache();

  /** Returns true for every non-sequence document. */
  supports(document: DiagramDocument): boolean {
    return document.kind !== "sequence";
  }

  /** Computes a deterministic top-down, bottom-up, left-right, or right-left tree layout. */
  async layout(
    document: DiagramDocument,
    options: TreeLayoutOptions = {}
  ): Promise<PositionedDiagram> {
    const cached = this.#cache.get(document, options);
    if (cached !== undefined) return cached;
    const positioned = createTreeLayout(document, options);
    this.#cache.set(document, options, positioned);
    return positioned;
  }
}

/** Creates a deterministic tree layout engine instance. */
export function treeLayout(): TreeLayoutEngine {
  return new TreeLayoutEngine();
}
