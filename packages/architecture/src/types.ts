import type { DiagramDocument, DiagramEdge, DiagramNode, StyleSheet } from "@drawspec/core";

export type C4ElementKind = "person" | "softwareSystem" | "container" | "database";
export type ArchitectureRelationshipKind = "uses";
export type ArchitectureViewKind = "systemContext" | "container";
export type AutoLayoutDirection = "left-right" | "right-left" | "top-down" | "bottom-up";

export interface ArchitectureElementOptions {
  id?: string;
  description?: string;
  technology?: string;
  owner?: string;
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

export interface ArchitectureRelationshipOptions {
  id?: string;
  description?: string;
  technology?: string;
  protocol?: string;
  direction?: DiagramEdge["direction"];
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
  criticality?: string;
  owner?: string;
}

export interface ArchitectureElement {
  readonly id: string;
  readonly kind: C4ElementKind;
  readonly name: string;
  readonly description: string | undefined;
  readonly technology: string | undefined;
  readonly owner: string | undefined;
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly parent: ArchitectureElement | undefined;
  readonly children: readonly ArchitectureElement[];
  add<T extends ArchitectureElement>(element: T): T;
  uses(
    target: ArchitectureElement,
    label: string,
    options?: ArchitectureRelationshipOptions
  ): ArchitectureRelationship;
}
export interface ArchitectureRelationship {
  readonly id: string;
  readonly kind: ArchitectureRelationshipKind;
  readonly source: ArchitectureElement;
  readonly target: ArchitectureElement;
  readonly label: string;
  readonly description: string | undefined;
  readonly technology: string | undefined;
  readonly protocol: string | undefined;
  readonly direction: NonNullable<DiagramEdge["direction"]>;
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ArchitectureView {
  readonly id: string;
  readonly kind: ArchitectureViewKind;
  readonly key: string;
  readonly title: string;
  readonly subject: ArchitectureElement;
  readonly includedElements: readonly ArchitectureElement[];
  readonly includeAll: boolean;
  readonly layoutDirection: AutoLayoutDirection | undefined;
  include(...elements: (ArchitectureElement | "*")[]): this;
  autoLayout(direction: AutoLayoutDirection): this;
}

export interface ArchitectureModel {
  readonly elements: readonly ArchitectureElement[];
  readonly relationships: readonly ArchitectureRelationship[];
  add<T extends ArchitectureElement>(element: T): T;
  use(model: ArchitectureModel): void;
}

export interface ArchitectureViews {
  readonly items: readonly ArchitectureView[];
  systemContext(
    subject: ArchitectureElement,
    key?: string,
    configure?: (view: ArchitectureView) => void
  ): ArchitectureView;
  container(
    subject: ArchitectureElement,
    key?: string,
    configure?: (view: ArchitectureView) => void
  ): ArchitectureView;
}
export interface ArchitectureStyles {
  readonly stylesheet: StyleSheet;
  element(tag: string, options: Record<string, string | number>): void;
  relationship(tag: string, options: Record<string, string | number>): void;
}

export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly model: ArchitectureModel;
  readonly views: ArchitectureViews;
  readonly styles: ArchitectureStyles;
  compile(): DiagramDocument[];
}

export type WorkspaceContext = Workspace;
export type WorkspaceInitializer = (workspace: WorkspaceContext) => void;
export type ArchitectureDiagramNode = DiagramNode & { kind: C4ElementKind };
