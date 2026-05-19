import type { DiagramDocument } from "@drawspec/core";

export type PseudostateKind = "initial" | "final";
export type StateNodeElement = StateElement | PseudostateElement;
export type StateTransitionTarget = string | StateNodeElement;

export interface TransitionLabelBuilder {
  readonly transition: Transition;
  label(text: string): Transition;
}

export interface StateBuilder {
  to(target: StateTransitionTarget, label?: string): TransitionLabelBuilder;
}

export interface StateElement extends StateBuilder {
  readonly id: string;
  readonly name: string;
  readonly kind: "state";
  readonly transitions: readonly Transition[];
}

export interface PseudostateElement extends StateBuilder {
  readonly id: string;
  readonly name: string;
  readonly kind: "pseudostate";
  readonly pseudostate: PseudostateKind;
  readonly transitions: readonly Transition[];
}

export interface Transition {
  readonly id: string;
  readonly sourceId: string;
  readonly targetRef: string;
  readonly label?: string;
}

export type StateDiagramElement = StateElement | PseudostateElement;

export interface StateDomainModel {
  readonly id: string;
  readonly title: string;
  readonly elements: readonly StateDiagramElement[];
}

export type StateDocument = DiagramDocument & { kind: "state" };
