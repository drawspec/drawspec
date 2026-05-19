import type { Diagnostic, DiagramEdge, DiagramNode } from "@drawspec/core";
import type { ActivityDocument, ActivityDomainModel } from "./types";

function validateActivity(model: ActivityDomainModel): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const incomingCounts = new Map(model.elements.map((element) => [element.id, 0]));
  const outgoingCounts = new Map(model.elements.map((element) => [element.id, 0]));

  for (const flow of model.flows) {
    incomingCounts.set(flow.targetId, (incomingCounts.get(flow.targetId) ?? 0) + 1);
    outgoingCounts.set(flow.sourceId, (outgoingCounts.get(flow.sourceId) ?? 0) + 1);
  }

  for (const element of model.elements) {
    const incoming = incomingCounts.get(element.id) ?? 0;
    const outgoing = outgoingCounts.get(element.id) ?? 0;

    if (element.kind === "action" && incoming === 0) {
      diagnostics.push({
        code: "DS_ACTIVITY_UNREACHABLE_ACTION",
        severity: "warning",
        message: `Action is unreachable: ${element.label}`,
        target: element.id,
        help: "Connect the action from a start, action, or decision node.",
      });
    }

    if (incoming === 0 && outgoing === 0) {
      diagnostics.push({
        code: "DS_ACTIVITY_NO_ORPHAN_NODES",
        severity: "warning",
        message: `Activity node has no flows: ${element.label}`,
        target: element.id,
        help: "Connect the node with at least one incoming or outgoing flow.",
      });
    }
  }

  return diagnostics;
}

export function compileActivityDocument(model: ActivityDomainModel): ActivityDocument {
  const nodes: DiagramNode[] = model.elements.map((element) => ({
    id: element.id,
    kind: element.kind,
    label: element.label,
  }));

  const edges: DiagramEdge[] = model.flows.map((flow) => ({
    id: flow.id,
    kind: "flow",
    sourceId: flow.sourceId,
    targetId: flow.targetId,
    ...(flow.label ? { label: flow.label } : {}),
    direction: "forward",
  }));

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "activity",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics: validateActivity(model),
  };
}
