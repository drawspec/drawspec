import type { DiagramDocument } from "@drawspec/core";

export type ActivityNodeKind = "action" | "decision" | "initial" | "final";

export interface FlowEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label?: string;
}

export interface ActivityElement {
  readonly id: string;
  readonly label: string;
  readonly kind: ActivityNodeKind;
  readonly outgoing: readonly FlowEdge[];
  to(target: ActivityTarget): ActivityFlowBuilder;
}

export interface ActionElement extends ActivityElement {
  readonly kind: "action";
}

export interface DecisionElement extends ActivityElement {
  readonly kind: "decision";
  when(label: string): ActivityBranchBuilder;
}

export interface ControlElement extends ActivityElement {
  readonly kind: "initial" | "final";
}

export type ActivityTarget = string | ActivityElement;

export interface ActivityFlowBuilder {
  readonly flow: FlowEdge;
  when(label: string): ActivityFlowBuilder;
  to(target: ActivityTarget): ActivityFlowBuilder;
}

export interface ActivityBranchBuilder {
  to(target: ActivityTarget): ActivityFlowBuilder;
}

export type ActivityDefinition =
  | ActivityElement
  | ActivityFlowBuilder
  | ActivityBranchBuilder
  | readonly ActivityDefinition[]
  | undefined;

export interface ActivityBuilderContext {
  action(label: string, define?: (action: ActionElement) => ActivityDefinition): ActionElement;
  decision(
    label: string,
    define?: (decision: DecisionElement) => ActivityDefinition
  ): DecisionElement;
  start(label?: string): ControlElement;
  end(label?: string): ControlElement;
}

export interface ActivityDomainModel {
  readonly id: string;
  readonly title: string;
  readonly elements: readonly ActivityElement[];
  readonly flows: readonly FlowEdge[];
}

export type ActivityDocument = DiagramDocument & { kind: "activity" };
