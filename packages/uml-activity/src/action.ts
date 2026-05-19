import { getActiveActivityBuilder } from "./context";
import type { ActionElement, ActivityDefinition } from "./types";

export function action(
  label: string,
  define?: (action: ActionElement) => ActivityDefinition
): ActionElement {
  return getActiveActivityBuilder().action(label, define);
}
