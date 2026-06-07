import {
  createDeterministicId,
  createDiagnostic,
  type Diagnostic,
  type DiagramEdge,
  type DiagramNode,
  IdRegistry,
} from "@drawspec/core";
import type { MindmapDocument, MindmapDomainModel, MindmapNode } from "./types";
import { BRANCH_COLORS, lightenColor, mapShape } from "./types";

/** Branch info tracked during compilation for color assignment. */
interface BranchInfo {
  /** The branch color assigned to this top-level branch. */
  color: string;
  /** The 0-based branch index for palette cycling. */
  index: number;
}

/** Gets a color from the palette by index, with deterministic wrapping. */
function paletteColor(index: number): string {
  return BRANCH_COLORS[index % BRANCH_COLORS.length] ?? BRANCH_COLORS[0] ?? "#4f46e5";
}

/** Default branch color used when no palette is available. */
const DEFAULT_BRANCH_COLOR = BRANCH_COLORS[0] ?? "#4f46e5";
function register(registry: IdRegistry, id: string, diagnostics: Diagnostic[]): void {
  const diagnostic = registry.registerId(id);
  if (diagnostic) {
    diagnostics.push(diagnostic);
  }
}

/** Validates that the root node has text. */
function validateRoot(model: MindmapDomainModel, diagnostics: Diagnostic[]): void {
  if (!model.root.text.trim()) {
    diagnostics.push(
      createDiagnostic({
        code: "mindmap/empty-root",
        severity: "error",
        message: "Mindmap root node must have non-empty text.",
        target: model.root.id,
        help: "Provide a label for the root node.",
      })
    );
  }
}

/** Validates that no duplicate sibling text exists at any level. */
function validateDuplicateSiblings(node: MindmapNode, diagnostics: Diagnostic[]): void {
  const seen = new Map<string, string>();
  for (const child of node.children) {
    const existingId = seen.get(child.text);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "mindmap/no-duplicate-sibling",
          severity: "warning",
          message: `Duplicate sibling node "${child.text}".`,
          target: child.id,
          help: `Sibling node names should be unique. First occurrence: ${existingId}.`,
        })
      );
    } else {
      seen.set(child.text, child.id);
    }
  }
  for (const child of node.children) {
    validateDuplicateSiblings(child, diagnostics);
  }
}

/**
 * Recursively compiles a mindmap node tree into DiagramNode and DiagramEdge arrays.
 *
 * @param node - The mindmap node to compile
 * @param parentId - The parent node ID (undefined for root)
 * @param branchInfo - Branch color info from the top-level branch ancestor
 * @param depth - Current depth in the tree (0 for root)
 * @param nodes - Accumulator for compiled DiagramNodes
 * @param edges - Accumulator for compiled DiagramEdges
 */
function compileNode(
  node: MindmapNode,
  parentId: string | undefined,
  branchInfo: BranchInfo | undefined,
  depth: number,
  nodes: DiagramNode[],
  edges: DiagramEdge[]
): void {
  const isRoot = parentId === undefined;
  const kind = isRoot ? "mindmap-root" : "mindmap-node";
  const shape = mapShape(node.shape);

  // Determine the color for this node
  const branchColor = isRoot ? undefined : (node.color ?? branchInfo?.color);

  // Depth-based fill: lighter at deeper levels
  const fillFactor = isRoot ? 0 : Math.min(depth * 0.1, 0.4);
  const fill = branchColor ? lightenColor(branchColor, fillFactor) : undefined;
  const stroke = branchColor ?? undefined;

  const diagramNode: DiagramNode = {
    id: node.id,
    kind,
    label: node.shape === "bang" ? `! ${node.text}` : node.text,
    shape,
    ...(isRoot ? {} : { parentId }),
    ...(fill || stroke
      ? {
          style: {
            id: `mindmap-branch-${branchInfo?.index ?? 0}`,
            variant: `depth-${depth}`,
          },
        }
      : {}),
    metadata: {
      ...(branchColor ? { branchColor } : {}),
      depth,
    },
  };

  // Apply kind-based fill/stroke via tags for the style system
  if (fill) {
    diagramNode.tags = [`branch-color-${branchInfo?.index ?? 0}`];
  }

  nodes.push(diagramNode);

  // Create edge from parent to this node
  if (parentId !== undefined) {
    const edge: DiagramEdge = {
      id: createDeterministicId(
        { kind: "mindmap-branch", source: parentId, target: node.id },
        { prefix: "mmb", length: 10 }
      ),
      kind: "mindmap-branch",
      sourceId: parentId,
      targetId: node.id,
      direction: "none",
    };
    edges.push(edge);
  }

  // Compile children, assigning branch colors for top-level branches
  for (const child of node.children) {
    const childIndex = node.children.indexOf(child);
    const childBranch: BranchInfo = isRoot
      ? {
          color: child.color ?? paletteColor(childIndex),
          index: childIndex,
        }
      : (branchInfo ?? { color: DEFAULT_BRANCH_COLOR, index: 0 });

    compileNode(child, node.id, childBranch, isRoot ? 1 : depth + 1, nodes, edges);
  }
}

/**
 * Compile a mindmap domain model into a DiagramDocument IR.
 *
 * @param model - The mindmap domain model containing the root node
 * @returns A compiled MindmapDocument ready for layout and rendering
 */
export function compileMindmapDocument(model: MindmapDomainModel): MindmapDocument {
  const diagnostics: Diagnostic[] = [];
  const registry = new IdRegistry();
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  compileNode(model.root, undefined, undefined, 0, nodes, edges);

  // Sort deterministically by id
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  // Register all IDs
  register(registry, model.id, diagnostics);
  for (const node of nodes) {
    register(registry, node.id, diagnostics);
  }
  for (const edge of edges) {
    register(registry, edge.id, diagnostics);
  }

  // Validation
  validateRoot(model, diagnostics);
  validateDuplicateSiblings(model.root, diagnostics);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "mindmap",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics,
  };
}

/**
 * Compile a mindmap from a title and root node definition.
 *
 * @param title - Diagram title
 * @param model - The mindmap domain model
 * @returns A compiled MindmapDocument
 *
 * @example
 * ```ts
 * compile("My Mindmap", model)
 * ```
 */
export function compile(title: string, model: MindmapDomainModel): MindmapDocument {
  return compileMindmapDocument({
    ...model,
    id: createDeterministicId(["mindmap-document", title], { prefix: "mmdoc", length: 8 }),
    title,
  });
}
