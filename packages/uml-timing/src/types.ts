import type { DiagramDocument } from "@drawspec/core";

/** Participant type in a timing diagram. */
export type TimingParticipantType = "actor" | "participant";

/** Timing diagram participant. */
export interface TimingParticipant {
  readonly id: string;
  readonly kind: "timing-participant";
  readonly name: string;
  readonly participantType?: TimingParticipantType;
}

/** Timing diagram state. */
export interface TimingState {
  readonly id: string;
  readonly kind: "timing-state";
  readonly name: string;
  readonly color?: string;
}

/** Transition between states for a participant. */
export interface TimingTransition {
  readonly id: string;
  readonly kind: "timing-transition";
  readonly participantName: string;
  readonly fromStateName: string;
  readonly toStateName: string;
  readonly atTime: number;
  readonly message?: string;
}

/** Message between participants at a specific time. */
export interface TimingMessage {
  readonly id: string;
  readonly kind: "timing-message";
  readonly sourceName: string;
  readonly targetName: string;
  readonly atTime: number;
  readonly label?: string;
}

export type TimingDiagramElement =
  | TimingParticipant
  | TimingState
  | TimingTransition
  | TimingMessage;

/** Domain model for timing diagrams before compilation to IR. */
export interface TimingDomainModel {
  readonly id: string;
  readonly title: string;
  readonly participants: readonly TimingParticipant[];
  readonly states: readonly TimingState[];
  readonly transitions: readonly TimingTransition[];
  readonly messages: readonly TimingMessage[];
}

/** Compiled timing diagram document. */
export type TimingDocument = DiagramDocument & { kind: "timing" };
