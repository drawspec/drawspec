import type { DiagramDocument } from "@drawspec/core";

/** Relationship type between use case elements. */
export type UseCaseRelationshipType = "include" | "extend" | "associate" | "generalize";

/** Actor in a use case diagram. */
export interface Actor {
  readonly id: string;
  readonly kind: "actor";
  readonly name: string;
  readonly stereotype?: string;
}

/** Use case element. */
export interface UseCase {
  readonly id: string;
  readonly kind: "use-case";
  readonly name: string;
  readonly description?: string;
}

/** System boundary grouping use cases. */
export interface SystemBoundary {
  readonly id: string;
  readonly kind: "system-boundary";
  readonly name: string;
  readonly useCaseNames: readonly string[];
}

/** Relationship between actors, use cases, or system boundaries. */
export interface UseCaseRelationship {
  readonly id: string;
  readonly kind: UseCaseRelationshipType;
  readonly sourceName: string;
  readonly targetName: string;
}

export type UseCaseDiagramElement = Actor | UseCase | SystemBoundary | UseCaseRelationship;

/** Domain model for use case diagrams before compilation to IR. */
export interface UseCaseDomainModel {
  readonly id: string;
  readonly title: string;
  readonly actors: readonly Actor[];
  readonly useCases: readonly UseCase[];
  readonly systemBoundaries: readonly SystemBoundary[];
  readonly relationships: readonly UseCaseRelationship[];
}

/** Compiled use case diagram document. */
export type UseCaseDocument = DiagramDocument & { kind: "use-case" };
