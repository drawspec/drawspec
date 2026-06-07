import type { DiagramDocument } from "@drawspec/core";

/** Attribute constraint type — primary key, foreign key, or none. */
export type AttributeConstraint = "pk" | "fk";

/** ER entity attribute. */
export interface ErAttribute {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly constraint?: AttributeConstraint;
  readonly nullable?: boolean;
}

/** ER entity (table) with attributes. */
export interface ErEntity {
  readonly id: string;
  readonly kind: "entity";
  readonly name: string;
  readonly attributes: readonly ErAttribute[];
}

/** Cardinality for one end of a relationship. */
export type CardinalityEnd = "1" | "0..1" | "*" | "1..*";

/** ER relationship between two entities. */
export interface ErRelationship {
  readonly id: string;
  readonly kind: "relationship";
  readonly name?: string;
  readonly sourceName: string;
  readonly targetName: string;
  readonly sourceCardinality: CardinalityEnd;
  readonly targetCardinality: CardinalityEnd;
}

export type ErDiagramElement = ErEntity | ErRelationship;

/** Builder for constructing ER entities fluently. */
export interface EntityBuilder {
  attribute(name: string, type: string, options?: AttributeOptions): EntityBuilder;
  pk(name: string, type: string): EntityBuilder;
  fk(name: string, type: string): EntityBuilder;
}

/** Options for entity attributes. */
export interface AttributeOptions {
  readonly constraint?: AttributeConstraint;
  readonly nullable?: boolean;
}

/** Domain model for ER diagrams before compilation to IR. */
export interface ErDomainModel {
  readonly id: string;
  readonly title: string;
  readonly entities: readonly ErEntity[];
  readonly relationships: readonly ErRelationship[];
}

/** Compiled ER diagram document. */
export type ErDocument = DiagramDocument & { kind: "er" };
