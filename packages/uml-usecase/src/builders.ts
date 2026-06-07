import { createDeterministicId } from "@drawspec/core";
import type {
  Actor,
  SystemBoundary,
  UseCase,
  UseCaseRelationship,
  UseCaseRelationshipType,
} from "./types";

/**
 * Create an actor element for a use case diagram.
 *
 * @param name - Actor name (e.g. "User", "Admin")
 * @param options - Optional stereotype
 * @returns A compiled Actor ready for diagram inclusion
 *
 * @example
 * ```ts
 * actor("User")
 * actor("System", { stereotype: "external" })
 * ```
 */
export function actor(name: string, options?: { stereotype?: string }): Actor {
  return {
    id: createDeterministicId(["usecase-actor", name], { prefix: "actor", length: 8 }),
    kind: "actor",
    name,
    ...(options?.stereotype ? { stereotype: options.stereotype } : {}),
  };
}

/**
 * Create a use case element.
 *
 * @param name - Use case name (e.g. "Login", "Place Order")
 * @param options - Optional description
 * @returns A compiled UseCase ready for diagram inclusion
 *
 * @example
 * ```ts
 * useCase("Login")
 * useCase("Place Order", { description: "Customer places an order" })
 * ```
 */
export function useCase(name: string, options?: { description?: string }): UseCase {
  return {
    id: createDeterministicId(["usecase-uc", name], { prefix: "uc", length: 8 }),
    kind: "use-case",
    name,
    ...(options?.description ? { description: options.description } : {}),
  };
}

/**
 * Create a system boundary grouping use cases.
 *
 * @param name - Boundary name (e.g. "Online Store")
 * @param useCaseNames - Names of contained use cases
 * @returns A compiled SystemBoundary
 *
 * @example
 * ```ts
 * systemBoundary("Online Store", ["Browse Products", "Place Order"])
 * ```
 */
export function systemBoundary(name: string, useCaseNames: readonly string[]): SystemBoundary {
  return {
    id: createDeterministicId(["usecase-boundary", name], { prefix: "boundary", length: 8 }),
    kind: "system-boundary",
    name,
    useCaseNames,
  };
}

/**
 * Create a relationship between use case elements.
 *
 * @param sourceName - Source element name
 * @param targetName - Target element name
 * @param type - Relationship type
 * @returns A compiled UseCaseRelationship
 *
 * @example
 * ```ts
 * useCaseRelationship("User", "Login", "associate")
 * useCaseRelationship("Login", "Authenticate", "include")
 * ```
 */
export function useCaseRelationship(
  sourceName: string,
  targetName: string,
  type: UseCaseRelationshipType
): UseCaseRelationship {
  return {
    id: createDeterministicId(["usecase-rel", sourceName, targetName, type], {
      prefix: "rel",
      length: 8,
    }),
    kind: type,
    sourceName,
    targetName,
  };
}
