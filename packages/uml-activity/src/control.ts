import { getActiveActivityBuilder } from "./context";
import type { ControlElement } from "./types";

export function start(label = "start"): ControlElement {
  return getActiveActivityBuilder().start(label);
}

export function end(label = "end"): ControlElement {
  return getActiveActivityBuilder().end(label);
}
