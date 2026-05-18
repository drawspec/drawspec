import type { DiagramDocument } from "@drawspec/core";

export type SequenceRole = "actor" | "participant";

export interface SequenceNote {
  id: string;
  text: string;
  targetId: string;
}

export interface NoteTarget {
  readonly id: string;
  note(text: string): this;
}

export interface SequenceElement extends NoteTarget {
  readonly id: string;
  readonly name: string;
  readonly role: SequenceRole;
  readonly notes: readonly SequenceNote[];
  to(other: SequenceElement, label: string): SequenceMessage;
}

export interface SequenceActor extends SequenceElement {
  readonly role: "actor";
}

export interface SequenceParticipant extends SequenceElement {
  readonly role: "participant";
}

export interface SequenceMessage extends NoteTarget {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label: string;
  readonly notes: readonly SequenceNote[];
}

export interface SequenceFragmentOperand {
  readonly condition: string;
  readonly children: readonly SequenceFragmentChild[];
}

export interface SequenceFragment {
  readonly id: string;
  readonly kind: "alt";
  readonly operands: readonly SequenceFragmentOperand[];
}

export type SequenceFragmentChild = SequenceMessage | SequenceFragment;

export interface SequenceFragmentBuilder {
  else(condition: string, callback: (sequence: SequenceBuilder) => void): SequenceFragmentBuilder;
}

export interface SequenceBuilder {
  actor(name: string): SequenceActor;
  participant(name: string): SequenceParticipant;
  alt(condition: string, callback: (sequence: SequenceBuilder) => void): SequenceFragmentBuilder;
}

export interface SequenceDomainModel {
  readonly id: string;
  readonly title: string;
  readonly elements: readonly SequenceElement[];
  readonly children: readonly SequenceFragmentChild[];
}

export type SequenceDocument = DiagramDocument & { kind: "sequence" };
