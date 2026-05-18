import { getActiveActivityBuilder } from "./context";
import type { ActivityDefinition, DecisionElement } from "./types";

export function decision(
  label: string,
  define?: (decision: DecisionElement) => ActivityDefinition
): DecisionElement {
  return getActiveActivityBuilder().decision(label, define);
}
