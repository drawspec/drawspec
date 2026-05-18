import type { DiagramAnnotation, DiagramEdge, DiagramGroup, DiagramNode } from "@drawspec/core";
import type {
  SequenceDocument,
  SequenceDomainModel,
  SequenceFragment,
  SequenceFragmentChild,
  SequenceMessage,
  SequenceNote,
} from "./types";

interface CompileChildResult {
  childIds: string[];
  edgeIds: string[];
  groupIds: string[];
}

function isMessage(child: SequenceFragmentChild): child is SequenceMessage {
  return "sourceId" in child;
}

function compileNote(note: SequenceNote): DiagramAnnotation {
  return {
    id: note.id,
    kind: "note",
    label: note.text,
    targetId: note.targetId,
  };
}

function compileMessage(
  message: SequenceMessage,
  edges: DiagramEdge[],
  annotations: DiagramAnnotation[]
): CompileChildResult {
  edges.push({
    id: message.id,
    kind: "message",
    sourceId: message.sourceId,
    targetId: message.targetId,
    label: message.label,
    direction: "forward",
  });

  annotations.push(...message.notes.map(compileNote));
  return { childIds: [message.id], edgeIds: [message.id], groupIds: [] };
}

function compileChildren(
  children: readonly SequenceFragmentChild[],
  edges: DiagramEdge[],
  groups: DiagramGroup[],
  annotations: DiagramAnnotation[]
): CompileChildResult {
  const childIds: string[] = [];
  const edgeIds: string[] = [];
  const groupIds: string[] = [];

  for (const child of children) {
    const result = isMessage(child)
      ? compileMessage(child, edges, annotations)
      : compileFragment(child, edges, groups, annotations);
    childIds.push(...result.childIds);
    edgeIds.push(...result.edgeIds);
    groupIds.push(...result.groupIds);
  }

  return { childIds, edgeIds, groupIds };
}

function compileFragment(
  fragment: SequenceFragment,
  edges: DiagramEdge[],
  groups: DiagramGroup[],
  annotations: DiagramAnnotation[]
): CompileChildResult {
  const operandMetadata: Array<{ condition: string; childIds: string[] }> = [];
  const childIds: string[] = [];

  for (const operand of fragment.operands) {
    const result = compileChildren(operand.children, edges, groups, annotations);
    operandMetadata.push({ condition: operand.condition, childIds: result.childIds });
    childIds.push(...result.childIds);
  }

  groups.push({
    id: fragment.id,
    kind: fragment.kind,
    label: fragment.kind,
    childIds,
    metadata: { operands: operandMetadata },
  });

  return { childIds: [fragment.id], edgeIds: [], groupIds: [fragment.id] };
}

export function compileSequenceDocument(model: SequenceDomainModel): SequenceDocument {
  const nodes: DiagramNode[] = model.elements.map((element) => ({
    id: element.id,
    kind: element.role,
    label: element.name,
  }));
  const edges: DiagramEdge[] = [];
  const groups: DiagramGroup[] = [];
  const annotations: DiagramAnnotation[] = [];

  for (const element of model.elements) {
    annotations.push(...element.notes.map(compileNote));
  }

  compileChildren(model.children, edges, groups, annotations);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "sequence",
    nodes,
    edges,
    groups,
    annotations,
  };
}
