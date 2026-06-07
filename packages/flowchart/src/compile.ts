import type { Diagnostic, DiagramEdge, DiagramNode, NodeShapeSpec } from "@drawspec/core";
import type { FlowchartDocument, FlowchartDomainModel, FlowchartElement } from "./types";

/** Map flowchart node kinds to shape specs for rendering. */
function shapeForKind(kind: FlowchartElement["kind"]): NodeShapeSpec | undefined {
  switch (kind) {
    case "process":
      return { type: "rounded-rect", radius: 8 };
    case "decision":
      return { type: "diamond" };
    case "terminal":
      return { type: "rounded-rect", radius: 20 };
    case "io":
      return { type: "parallelogram" };
    case "connector":
      return { type: "circle" };
    case "subgraph":
      return { type: "rounded-rect", radius: 12 };
  }
}

/** Validate a flowchart domain model and return diagnostics. */
function validateFlowchart(model: FlowchartDomainModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const elementIds = new Set(model.elements.map((el) => el.id));
  const incomingCounts = new Map(model.elements.map((el) => [el.id, 0]));
  const outgoingCounts = new Map(model.elements.map((el) => [el.id, 0]));

  for (const edge of model.edges) {
    outgoingCounts.set(edge.sourceId, (outgoingCounts.get(edge.sourceId) ?? 0) + 1);
    incomingCounts.set(edge.targetId, (incomingCounts.get(edge.targetId) ?? 0) + 1);
  }

  for (const element of model.elements) {
    const incoming = incomingCounts.get(element.id) ?? 0;
    const outgoing = outgoingCounts.get(element.id) ?? 0;

    // Orphan node check — no connections at all
    if (incoming === 0 && outgoing === 0) {
      diagnostics.push({
        code: "flowchart/orphan-node",
        severity: "warning",
        message: `Flowchart node "${element.label}" has no connections.`,
        target: element.id,
        help: "Connect the node with at least one incoming or outgoing edge.",
      });
    }

    // Decision node should have 2+ outgoing branches
    if (element.kind === "decision" && outgoing < 2) {
      diagnostics.push({
        code: "flowchart/decision-needs-branches",
        severity: "warning",
        message: `Decision node "${element.label}" has fewer than 2 outgoing branches.`,
        target: element.id,
        help: "A decision should have at least two paths (e.g., yes/no).",
      });
    }
  }

  // Check for dangling edge references
  for (const edge of model.edges) {
    if (!elementIds.has(edge.targetId)) {
      diagnostics.push({
        code: "flowchart/dangling-edge-target",
        severity: "error",
        message: `Edge targets unknown node "${edge.targetId}".`,
        target: edge.id,
        help: "Ensure all edge targets reference an existing node.",
      });
    }
  }

  return diagnostics;
}

/** Compile a flowchart domain model to a DiagramDocument IR. */
export function compileFlowchartDocument(model: FlowchartDomainModel): FlowchartDocument {
  const nodes: DiagramNode[] = model.elements
    .map((element) => {
      const shape = shapeForKind(element.kind);
      const node: DiagramNode = {
        id: element.id,
        kind: element.kind,
        label: element.label,
        ...(shape ? { shape } : {}),
      };

      if (element.kind === "subgraph") {
        node.metadata = { childIds: (element as { childIds: readonly string[] }).childIds };
      }

      return node;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const edges: DiagramEdge[] = model.edges
    .map((edge) => ({
      id: edge.id,
      kind: "flow",
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      direction: "forward" as const,
      ...(edge.label ? { label: edge.label } : {}),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "graph",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics: validateFlowchart(model),
  };
}
