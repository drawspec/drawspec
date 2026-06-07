import { createDeterministicId } from "@drawspec/core";
import type { CardinalityEnd, ErRelationship } from "./types";

/**
 * Create an ER relationship between two entities.
 *
 * @param sourceName - Source entity name
 * @param targetName - Target entity name
 * @param options - Relationship options including cardinality and name
 * @returns A compiled ErRelationship ready for diagram inclusion
 *
 * @example
 * ```ts
 * relationship("User", "Order", {
 *   sourceCardinality: "1",
 *   targetCardinality: "*",
 *   name: "places",
 * })
 * ```
 */
export function relationship(
  sourceName: string,
  targetName: string,
  options: {
    sourceCardinality?: CardinalityEnd;
    targetCardinality?: CardinalityEnd;
    name?: string;
  } = {}
): ErRelationship {
  return {
    id: createDeterministicId(
      [
        "er-relationship",
        sourceName,
        targetName,
        options.sourceCardinality ?? "*",
        options.targetCardinality ?? "*",
      ],
      { prefix: "rel", length: 8 }
    ),
    kind: "relationship",
    sourceName,
    targetName,
    sourceCardinality: options.sourceCardinality ?? "*",
    targetCardinality: options.targetCardinality ?? "*",
    ...(options.name ? { name: options.name } : {}),
  };
}
