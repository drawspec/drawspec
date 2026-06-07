import { createDeterministicId } from "@drawspec/core";
import { actor, systemBoundary, useCase, useCaseRelationship } from "./builders";
import { compileUseCaseDocument } from "./compile";
import type {
  Actor,
  SystemBoundary,
  UseCase,
  UseCaseDiagramElement,
  UseCaseDocument,
  UseCaseDomainModel,
  UseCaseRelationship,
} from "./types";

export { actor, systemBoundary, useCase, useCaseRelationship } from "./builders";
export { compile, compileUseCaseDocument } from "./compile";
export type {
  Actor,
  SystemBoundary,
  UseCase,
  UseCaseDiagramElement,
  UseCaseDocument,
  UseCaseDomainModel,
  UseCaseRelationship,
  UseCaseRelationshipType,
} from "./types";

/** API exposed inside the {@link usecaseDiagram} callback. */
export interface UseCaseDiagramBuilderApi {
  actor: typeof actor;
  useCase: typeof useCase;
  systemBoundary: typeof systemBoundary;
  includes: (sourceName: string, targetName: string) => UseCaseRelationship;
  extends: (sourceName: string, targetName: string) => UseCaseRelationship;
  associates: (sourceName: string, targetName: string) => UseCaseRelationship;
  generalizes: (sourceName: string, targetName: string) => UseCaseRelationship;
}

/**
 * Build a complete use case diagram with a callback-based DSL.
 *
 * @param title - Diagram title
 * @param callback - Builder callback receiving the DSL API
 * @returns A compiled UseCaseDocument ready for layout and rendering
 *
 * @example
 * ```ts
 * usecaseDiagram("Online Shopping", (dsl) => [
 *   dsl.actor("Customer"),
 *   dsl.useCase("Browse Products"),
 *   dsl.useCase("Place Order"),
 *   dsl.systemBoundary("Online Store", ["Browse Products", "Place Order"]),
 *   dsl.associates("Customer", "Browse Products"),
 *   dsl.associates("Customer", "Place Order"),
 * ])
 * ```
 */
export function usecaseDiagram(
  title: string,
  callback: (api: UseCaseDiagramBuilderApi) => readonly UseCaseDiagramElement[]
): UseCaseDocument {
  const api: UseCaseDiagramBuilderApi = {
    actor,
    useCase,
    systemBoundary,
    includes: (source, target) => useCaseRelationship(source, target, "include"),
    extends: (source, target) => useCaseRelationship(source, target, "extend"),
    associates: (source, target) => useCaseRelationship(source, target, "associate"),
    generalizes: (source, target) => useCaseRelationship(source, target, "generalize"),
  };

  const entries = callback(api);

  const actors = entries.filter((entry): entry is Actor => entry.kind === "actor");
  const useCases = entries.filter((entry): entry is UseCase => entry.kind === "use-case");
  const boundaries = entries.filter(
    (entry): entry is SystemBoundary => entry.kind === "system-boundary"
  );
  const relationships = entries.filter(
    (entry): entry is UseCaseRelationship =>
      entry.kind === "include" ||
      entry.kind === "extend" ||
      entry.kind === "associate" ||
      entry.kind === "generalize"
  );

  const model: UseCaseDomainModel = {
    id: createDeterministicId(["usecase-document", title], { prefix: "ucdoc", length: 8 }),
    title,
    actors,
    useCases,
    systemBoundaries: boundaries,
    relationships,
  };

  return compileUseCaseDocument(model);
}
