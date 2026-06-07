import { createDeterministicId } from "@drawspec/core";
import { compileErDocument } from "./compile";
import { entity } from "./entity";
import { relationship } from "./relationship";
import type {
  ErDiagramElement,
  ErDocument,
  ErDomainModel,
  ErEntity,
  ErRelationship,
} from "./types";

export { compile, compileErDocument } from "./compile";
export { entity, MutableEntityBuilder } from "./entity";
export { relationship } from "./relationship";
export type {
  AttributeConstraint,
  AttributeOptions,
  CardinalityEnd,
  EntityBuilder,
  ErAttribute,
  ErDiagramElement,
  ErDocument,
  ErDomainModel,
  ErEntity,
  ErRelationship,
} from "./types";

/** API exposed inside the {@link erDiagram} callback. */
export interface ErDiagramBuilderApi {
  entity: typeof entity;
  relationship: typeof relationship;
}

/**
 * Build a complete ER diagram with a callback-based DSL.
 *
 * @param title - Diagram title
 * @param callback - Builder callback receiving the DSL API
 * @returns A compiled ErDocument ready for layout and rendering
 *
 * @example
 * ```ts
 * erDiagram("User-Orders", ({ entity, relationship }) => [
 *   entity("User", (e) => e.pk("id", "UUID").attribute("name", "VARCHAR")),
 *   entity("Order", (e) => e.pk("id", "UUID").fk("userId", "UUID")),
 *   relationship("User", "Order", {
 *     sourceCardinality: "1",
 *     targetCardinality: "*",
 *     name: "places",
 *   }),
 * ])
 * ```
 */
export function erDiagram(
  title: string,
  callback: (api: ErDiagramBuilderApi) => readonly ErDiagramElement[]
): ErDocument {
  const entries = callback({ entity, relationship });
  const entities = entries.filter((entry): entry is ErEntity => entry.kind === "entity");
  const relationships = entries.filter(
    (entry): entry is ErRelationship => entry.kind === "relationship"
  );
  const model: ErDomainModel = {
    id: createDeterministicId(["er-document", title], { prefix: "erdoc", length: 8 }),
    title,
    entities,
    relationships,
  };
  return compileErDocument(model);
}
