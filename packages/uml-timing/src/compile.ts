import {
  createDeterministicId,
  createDiagnostic,
  type Diagnostic,
  type DiagramEdge,
  type DiagramNode,
  IdRegistry,
} from "@drawspec/core";
import type {
  TimingDocument,
  TimingDomainModel,
  TimingMessage,
  TimingParticipant,
  TimingState,
  TimingTransition,
} from "./types";

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function register(registry: IdRegistry, id: string, diagnostics: Diagnostic[]): void {
  const diagnostic = registry.registerId(id);
  if (diagnostic) {
    diagnostics.push(diagnostic);
  }
}

function validateDuplicateNames(
  participants: readonly TimingParticipant[],
  states: readonly TimingState[],
  diagnostics: Diagnostic[]
): void {
  const seen = new Map<string, string>();

  for (const p of participants) {
    const existingId = seen.get(p.name);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "timing/no-duplicate-name",
          severity: "error",
          message: `Duplicate participant name '${p.name}'.`,
          target: `participant:${p.id}`,
          help: `Participant names must be unique. First declaration: ${existingId}.`,
        })
      );
    } else {
      seen.set(p.name, p.id);
    }
  }

  for (const s of states) {
    const existingId = seen.get(s.name);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "timing/no-duplicate-name",
          severity: "error",
          message: `Duplicate state name '${s.name}'.`,
          target: `state:${s.id}`,
          help: `State names must be unique. First declaration: ${existingId}.`,
        })
      );
    } else {
      seen.set(s.name, s.id);
    }
  }
}

function validateTransitionRefs(
  participants: readonly TimingParticipant[],
  states: readonly TimingState[],
  transitions: readonly TimingTransition[],
  diagnostics: Diagnostic[]
): void {
  const participantNames = new Set(participants.map((p) => p.name));
  const stateNames = new Set(states.map((s) => s.name));

  for (const t of transitions) {
    if (!participantNames.has(t.participantName)) {
      diagnostics.push(
        createDiagnostic({
          code: "timing/no-unknown-ref",
          severity: "error",
          message: `Unknown participant '${t.participantName}' in transition.`,
          target: `transition:${t.id}`,
          help: "Reference a participant that exists in the diagram.",
        })
      );
    }
    if (!stateNames.has(t.fromStateName)) {
      diagnostics.push(
        createDiagnostic({
          code: "timing/no-unknown-ref",
          severity: "error",
          message: `Unknown state '${t.fromStateName}' in transition.`,
          target: `transition:${t.id}`,
          help: "Reference a state that exists in the diagram.",
        })
      );
    }
    if (!stateNames.has(t.toStateName)) {
      diagnostics.push(
        createDiagnostic({
          code: "timing/no-unknown-ref",
          severity: "error",
          message: `Unknown state '${t.toStateName}' in transition.`,
          target: `transition:${t.id}`,
          help: "Reference a state that exists in the diagram.",
        })
      );
    }
  }
}

function validateMessageRefs(
  participants: readonly TimingParticipant[],
  messages: readonly TimingMessage[],
  diagnostics: Diagnostic[]
): void {
  const participantNames = new Set(participants.map((p) => p.name));

  for (const m of messages) {
    if (!participantNames.has(m.sourceName)) {
      diagnostics.push(
        createDiagnostic({
          code: "timing/no-unknown-ref",
          severity: "error",
          message: `Unknown participant '${m.sourceName}' in message.`,
          target: `message:${m.id}`,
          help: "Reference a participant that exists in the diagram.",
        })
      );
    }
    if (!participantNames.has(m.targetName)) {
      diagnostics.push(
        createDiagnostic({
          code: "timing/no-unknown-ref",
          severity: "error",
          message: `Unknown participant '${m.targetName}' in message.`,
          target: `message:${m.id}`,
          help: "Reference a participant that exists in the diagram.",
        })
      );
    }
  }
}

function compileParticipantNode(participant: TimingParticipant): DiagramNode {
  return {
    id: participant.id,
    kind: "timing-participant",
    label: participant.name,
    ...(participant.participantType
      ? { metadata: { participantType: participant.participantType } }
      : {}),
  };
}

function compileStateNode(state: TimingState): DiagramNode {
  return {
    id: state.id,
    kind: "timing-state",
    label: state.name,
    shape: { type: "rounded-rect", radius: 8 },
    ...(state.color ? { metadata: { color: state.color } } : {}),
  };
}

function compileTransitionEdge(
  transition: TimingTransition,
  participantMap: Map<string, TimingParticipant>,
  stateMap: Map<string, TimingState>
): DiagramEdge | null {
  const participant = participantMap.get(transition.participantName);
  const fromState = stateMap.get(transition.fromStateName);
  const toState = stateMap.get(transition.toStateName);
  if (!participant || !fromState || !toState) {
    return null;
  }

  return {
    id: transition.id,
    kind: "timing-transition",
    sourceId: fromState.id,
    targetId: toState.id,
    direction: "forward",
    metadata: {
      participantId: participant.id,
      atTime: transition.atTime,
    },
    ...(transition.message ? { label: transition.message } : {}),
  };
}

function compileMessageEdge(
  message: TimingMessage,
  participantMap: Map<string, TimingParticipant>
): DiagramEdge | null {
  const source = participantMap.get(message.sourceName);
  const target = participantMap.get(message.targetName);
  if (!source || !target) {
    return null;
  }

  return {
    id: message.id,
    kind: "timing-message",
    sourceId: source.id,
    targetId: target.id,
    direction: "forward",
    metadata: {
      atTime: message.atTime,
    },
    ...(message.label ? { label: message.label } : {}),
  };
}

/**
 * Compile a timing diagram domain model into a DiagramDocument IR.
 *
 * @param model - The timing diagram domain model
 * @returns A compiled TimingDocument ready for layout and rendering
 */
export function compileTimingDocument(model: TimingDomainModel): TimingDocument {
  const diagnostics: Diagnostic[] = [];
  const registry = new IdRegistry();

  const participantMap = new Map(model.participants.map((p) => [p.name, p]));
  const stateMap = new Map(model.states.map((s) => [s.name, s]));

  const participantNodes = model.participants.map(compileParticipantNode);
  const stateNodes = model.states.map(compileStateNode);
  const nodes = [...participantNodes, ...stateNodes].sort(byId);

  const transitionEdges = model.transitions
    .map((t) => compileTransitionEdge(t, participantMap, stateMap))
    .filter((edge): edge is DiagramEdge => edge !== null);
  const messageEdges = model.messages
    .map((m) => compileMessageEdge(m, participantMap))
    .filter((edge): edge is DiagramEdge => edge !== null);
  const edges = [...transitionEdges, ...messageEdges].sort(byId);

  register(registry, model.id, diagnostics);
  for (const node of nodes) {
    register(registry, node.id, diagnostics);
  }
  for (const edge of edges) {
    register(registry, edge.id, diagnostics);
  }

  validateDuplicateNames(model.participants, model.states, diagnostics);
  validateTransitionRefs(model.participants, model.states, model.transitions, diagnostics);
  validateMessageRefs(model.participants, model.messages, diagnostics);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "timing",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics,
  };
}

/**
 * Compile timing diagram elements into a DiagramDocument IR.
 *
 * @param title - Diagram title
 * @param participants - Array of participants
 * @param states - Array of states
 * @param transitions - Array of transitions (optional)
 * @param messages - Array of messages (optional)
 * @returns A compiled TimingDocument
 *
 * @example
 * ```ts
 * compile("Timing", participants, states, transitions, messages)
 * ```
 */
export function compile(
  title: string,
  participants: readonly TimingParticipant[],
  states: readonly TimingState[],
  transitions: readonly TimingTransition[] = [],
  messages: readonly TimingMessage[] = []
): TimingDocument {
  return compileTimingDocument({
    id: createDeterministicId(["timing-document", title], { prefix: "timdoc", length: 8 }),
    title,
    participants,
    states,
    transitions,
    messages,
  });
}
