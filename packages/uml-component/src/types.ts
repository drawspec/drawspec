import type { DiagramDocument } from "@drawspec/core";

export interface ComponentInterfaceRef {
  readonly name: string;
}

export interface ComponentElement {
  readonly id: string;
  readonly kind: "component";
  readonly name: string;
  readonly providedInterfaces: readonly ComponentInterfaceRef[];
  readonly requiredInterfaces: readonly ComponentInterfaceRef[];
}

export interface InterfaceElement {
  readonly id: string;
  readonly kind: "interface";
  readonly name: string;
}

export interface DependencyEdge {
  readonly id: string;
  readonly kind: "dependency" | "provides" | "requires";
  readonly sourceName: string;
  readonly targetName: string;
  readonly label?: string;
}

export type ComponentDiagramElement = ComponentElement | InterfaceElement | DependencyEdge;

export interface ComponentBuilder {
  provides(name: string): this;
  requires(name: string): this;
}

export interface ComponentDiagramDomainModel {
  readonly id: string;
  readonly title: string;
  readonly elements: readonly ComponentDiagramElement[];
}

export type ComponentDiagramDocument = DiagramDocument & { kind: "component" };
