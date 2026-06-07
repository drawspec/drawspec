import { createDeterministicId } from "@drawspec/core";
import type { ObjectLink } from "./types";

/**
 * Create a link between two object instances.
 *
 * @param sourceName - Source object name
 * @param targetName - Target object name
 * @param options - Optional label and multiplicities
 * @returns A compiled ObjectLink
 *
 * @example
 * ```ts
 * link("user1", "order1", { label: "places", sourceMultiplicity: "1", targetMultiplicity: "*" })
 * ```
 */
export function link(
  sourceName: string,
  targetName: string,
  options?: {
    label?: string;
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
  }
): ObjectLink {
  return {
    id: createDeterministicId(["object-link", sourceName, targetName, options?.label ?? ""], {
      prefix: "link",
      length: 8,
    }),
    kind: "link",
    sourceName,
    targetName,
    ...(options?.label ? { label: options.label } : {}),
    ...(options?.sourceMultiplicity ? { sourceMultiplicity: options.sourceMultiplicity } : {}),
    ...(options?.targetMultiplicity ? { targetMultiplicity: options.targetMultiplicity } : {}),
  };
}
