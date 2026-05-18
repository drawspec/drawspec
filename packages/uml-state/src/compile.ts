import { createDeterministicId, type DiagramEdge, type DiagramNode } from "@drawspec/core";
import type { StateDiagramElement, StateDocument, StateDomainModel, Transition } from "./types";

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function resolveTargetId(targetRef: string, elements: readonly StateDiagramElement[]): string {
  return (
    elements.find((element) => element.id === targetRef || element.name === targetRef)?.id ??
    targetRef
  );
}

function compileNode(element: StateDiagramElement): DiagramNode {
  if (element.kind === "pseudostate") {
    return {
      id: element.id,
      kind: "pseudostate",
      label: element.name,
      metadata: { pseudostate: element.pseudostate },
    };
  }

  return {
    id: element.id,
    kind: "state",
    label: element.name,
  };
}

function compileEdge(
  transition: Transition,
  elements: readonly StateDiagramElement[]
): DiagramEdge {
  const edge: DiagramEdge = {
    id: transition.id,
    kind: "transition",
    sourceId: transition.sourceId,
    targetId: resolveTargetId(transition.targetRef, elements),
    direction: "forward",
  };

  if (transition.label !== undefined) {
    edge.label = transition.label;
  }

  return edge;
}

export function compileStateDocument(model: StateDomainModel): StateDocument {
  const nodes = model.elements.map(compileNode).sort(byId);
  const transitions = model.elements.flatMap((element) => element.transitions);
  const edges = transitions.map((transition) => compileEdge(transition, model.elements)).sort(byId);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "state",
    nodes,
    edges,
    groups: [],
    annotations: [],
  };
}

export function stateDocumentId(title: string): string {
  return createDeterministicId({ kind: "state", title }, { prefix: "statedoc", length: 10 });
}
