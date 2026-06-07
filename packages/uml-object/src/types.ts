import type { DiagramDocument } from "@drawspec/core";

/** Attribute value pair in an object instance. */
export interface ObjectAttribute {
  readonly id: string;
  readonly name: string;
  readonly value: string;
}

/** Object instance with attributes. */
export interface ObjectInstance {
  readonly id: string;
  readonly kind: "object";
  readonly name: string;
  readonly className?: string;
  readonly attributes: readonly ObjectAttribute[];
}

/** Link between two object instances. */
export interface ObjectLink {
  readonly id: string;
  readonly kind: "link";
  readonly sourceName: string;
  readonly targetName: string;
  readonly label?: string;
  readonly sourceMultiplicity?: string;
  readonly targetMultiplicity?: string;
}

export type ObjectDiagramElement = ObjectInstance | ObjectLink;

/** Builder for constructing object instances fluently. */
export interface ObjectBuilder {
  attribute(name: string, value: string): ObjectBuilder;
}

/** Domain model for object diagrams before compilation to IR. */
export interface ObjectDomainModel {
  readonly id: string;
  readonly title: string;
  readonly instances: readonly ObjectInstance[];
  readonly links: readonly ObjectLink[];
}

/** Compiled object diagram document. */
export type ObjectDocument = DiagramDocument & { kind: "object" };
