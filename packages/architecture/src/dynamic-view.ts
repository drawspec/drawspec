import {
  createDeterministicId,
  createDiagnostic,
  type Diagnostic,
  type DiagramDocument,
  type DiagramEdge,
  type DiagramNode,
} from "@drawspec/core";
import type {
  ArchitectureElement,
  ArchitectureModel,
  ArchitectureRelationship,
  Workspace,
} from "./types";

/** Sequence diagram document accepted by dynamic view generation. */
export type SequenceDiagramDocument = DiagramDocument & { kind: "sequence" };

interface CollectedModel {
  elements: ArchitectureElement[];
  relationships: ArchitectureRelationship[];
}

interface ResolvedParticipant {
  node: DiagramNode;
  modelRef: string;
  element: ArchitectureElement | undefined;
}

function collectModel(model: ArchitectureModel): CollectedModel {
  const elements = [...model.elements];
  const relationships = [...model.relationships];
  const maybeImported = model as ArchitectureModel & {
    readonly importedModels?: readonly ArchitectureModel[];
  };
  for (const imported of maybeImported.importedModels ?? []) {
    const nested = collectModel(imported);
    elements.push(...nested.elements);
    relationships.push(...nested.relationships);
  }
  return { elements, relationships };
}

function flattenElements(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  const flattened: ArchitectureElement[] = [];
  const visit = (element: ArchitectureElement): void => {
    flattened.push(element);
    for (const child of [...element.children].sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      visit(child);
    }
  };
  for (const element of [...elements].sort((left, right) => left.id.localeCompare(right.id))) {
    visit(element);
  }
  return flattened;
}

function modelRefOf(node: DiagramNode): string | undefined {
  const value = node.metadata?.["modelRef"];
  return typeof value === "string" ? value : undefined;
}

function toNode(element: ArchitectureElement): DiagramNode {
  return {
    id: element.id,
    kind: element.kind,
    label: element.name,
    ...(element.description === undefined ? {} : { description: element.description }),
    ...(element.parent === undefined ? {} : { parentId: element.parent.id }),
    tags: [...element.tags].sort(),
    metadata: {
      ...(element.technology === undefined ? {} : { technology: element.technology }),
      ...(element.owner === undefined ? {} : { owner: element.owner }),
      ...element.metadata,
      ...(Object.keys(element.properties).length === 0 ? {} : { properties: element.properties }),
    },
  };
}

function matchingRelationship(
  relationships: readonly ArchitectureRelationship[],
  sourceId: string,
  targetId: string
): ArchitectureRelationship | undefined {
  return relationships.find((relationship) => {
    if (relationship.source.id === sourceId && relationship.target.id === targetId) {
      return relationship.direction !== "backward";
    }
    return (
      relationship.direction === "bidirectional" &&
      relationship.source.id === targetId &&
      relationship.target.id === sourceId
    );
  });
}

function invalidReference(message: string, target: string): Diagnostic {
  return createDiagnostic({
    code: "DS_ARCH_DYNAMIC_INVALID_REFERENCE",
    severity: "error",
    message,
    target,
  });
}

/** Generates a runtime architecture view from sequence interactions and model references. */
export function generateDynamicView(
  workspace: Workspace,
  sequenceDoc: SequenceDiagramDocument
): DiagramDocument {
  const collected = collectModel(workspace.model);
  const elements = flattenElements(collected.elements);
  const elementsById = new Map(elements.map((element) => [element.id, element]));
  const participants = new Map<string, ResolvedParticipant>();
  const diagnostics: Diagnostic[] = [];

  for (const node of sequenceDoc.nodes) {
    const modelRef = modelRefOf(node);
    if (modelRef === undefined) continue;
    const element = elementsById.get(modelRef);
    if (element === undefined) {
      diagnostics.push(
        invalidReference(
          `Sequence participant '${node.label ?? node.id}' references missing architecture element '${modelRef}'.`,
          node.id
        )
      );
    }
    participants.set(node.id, { node, modelRef, element });
  }

  const includedElements = new Map<string, ArchitectureElement>();
  const edges: DiagramEdge[] = [];
  let interactionIndex = 0;

  for (const sequenceEdge of sequenceDoc.edges) {
    if (sequenceEdge.kind !== "message") continue;
    const source = participants.get(sequenceEdge.sourceId);
    const target = participants.get(sequenceEdge.targetId);
    if (source === undefined || target === undefined) {
      diagnostics.push(
        invalidReference(
          `Sequence message '${sequenceEdge.label ?? sequenceEdge.id}' cannot be mapped because both participants need modelRef values.`,
          sequenceEdge.id
        )
      );
      continue;
    }
    if (source.element === undefined || target.element === undefined) continue;

    includedElements.set(source.element.id, source.element);
    includedElements.set(target.element.id, target.element);

    const relationship = matchingRelationship(
      collected.relationships,
      source.element.id,
      target.element.id
    );
    if (relationship === undefined) {
      diagnostics.push(
        invalidReference(
          `Sequence message '${sequenceEdge.label ?? sequenceEdge.id}' has no matching architecture relationship from '${source.modelRef}' to '${target.modelRef}'.`,
          sequenceEdge.id
        )
      );
    }

    const edgeId = createDeterministicId(
      {
        kind: "dynamic-interaction",
        sequenceId: sequenceDoc.id,
        messageId: sequenceEdge.id,
        index: interactionIndex,
      },
      { prefix: "dyn" }
    );
    interactionIndex += 1;
    edges.push({
      id: edgeId,
      kind: "dynamic-message",
      sourceId: source.element.id,
      targetId: target.element.id,
      ...(sequenceEdge.label === undefined ? {} : { label: sequenceEdge.label }),
      direction: "forward",
      metadata: {
        sequenceMessageId: sequenceEdge.id,
        sequenceSourceId: sequenceEdge.sourceId,
        sequenceTargetId: sequenceEdge.targetId,
        ...(relationship === undefined ? {} : { relationshipId: relationship.id }),
      },
    });
  }

  const title =
    sequenceDoc.title === undefined ? "Dynamic view" : `${sequenceDoc.title} dynamic view`;
  return {
    schemaVersion: "1.0",
    id: createDeterministicId(
      { kind: "dynamic-view", workspaceId: workspace.id, sequenceId: sequenceDoc.id },
      { prefix: "dynamic" }
    ),
    title,
    kind: "dynamic",
    nodes: [...includedElements.values()]
      .map(toNode)
      .sort((left, right) => left.id.localeCompare(right.id)),
    edges,
    groups: [],
    annotations: [],
    styles: workspace.styles.stylesheet,
    metadata: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      sequenceId: sequenceDoc.id,
      ...(sequenceDoc.title === undefined ? {} : { sequenceTitle: sequenceDoc.title }),
      viewKind: "dynamic",
    },
    ...(diagnostics.length === 0 ? {} : { diagnostics }),
  };
}
