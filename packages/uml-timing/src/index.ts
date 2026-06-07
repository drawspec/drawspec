import { createDeterministicId } from "@drawspec/core";
import { message, participant, state, transition } from "./builders";
import { compileTimingDocument } from "./compile";
import type {
  TimingDiagramElement,
  TimingDocument,
  TimingDomainModel,
  TimingMessage,
  TimingParticipant,
  TimingState,
  TimingTransition,
} from "./types";

export { message, participant, state, transition } from "./builders";
export { compile, compileTimingDocument } from "./compile";
export type {
  TimingDiagramElement,
  TimingDocument,
  TimingDomainModel,
  TimingMessage,
  TimingParticipant,
  TimingParticipantType,
  TimingState,
  TimingTransition,
} from "./types";

/** API exposed inside the {@link timingDiagram} callback. */
export interface TimingDiagramBuilderApi {
  participant: typeof participant;
  state: typeof state;
  transition: typeof transition;
  message: typeof message;
}

/**
 * Build a complete timing diagram with a callback-based DSL.
 *
 * @param title - Diagram title
 * @param callback - Builder callback receiving the DSL API
 * @returns A compiled TimingDocument ready for layout and rendering
 *
 * @example
 * ```ts
 * timingDiagram("Signal Timing", (dsl) => [
 *   dsl.participant("Alice"),
 *   dsl.participant("Bob"),
 *   dsl.state("Idle"),
 *   dsl.state("Active"),
 *   dsl.transition("Alice", "Idle", "Active", { atTime: 0 }),
 *   dsl.transition("Bob", "Idle", "Active", { atTime: 1, message: "signal" }),
 *   dsl.message("Alice", "Bob", 1, { label: "request" }),
 * ])
 * ```
 */
export function timingDiagram(
  title: string,
  callback: (api: TimingDiagramBuilderApi) => readonly TimingDiagramElement[]
): TimingDocument {
  const api: TimingDiagramBuilderApi = { participant, state, transition, message };
  const entries = callback(api);

  const participants = entries.filter(
    (entry): entry is TimingParticipant => entry.kind === "timing-participant"
  );
  const states = entries.filter((entry): entry is TimingState => entry.kind === "timing-state");
  const transitions = entries.filter(
    (entry): entry is TimingTransition => entry.kind === "timing-transition"
  );
  const messages = entries.filter(
    (entry): entry is TimingMessage => entry.kind === "timing-message"
  );

  const model: TimingDomainModel = {
    id: createDeterministicId(["timing-document", title], { prefix: "timdoc", length: 8 }),
    title,
    participants,
    states,
    transitions,
    messages,
  };

  return compileTimingDocument(model);
}
