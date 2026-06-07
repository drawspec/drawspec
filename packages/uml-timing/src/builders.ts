import { createDeterministicId } from "@drawspec/core";
import type {
  TimingMessage,
  TimingParticipant,
  TimingParticipantType,
  TimingState,
  TimingTransition,
} from "./types";

/**
 * Create a timing diagram participant.
 *
 * @param name - Participant name
 * @param options - Optional participant type
 * @returns A compiled TimingParticipant
 *
 * @example
 * ```ts
 * participant("Alice")
 * participant("Bob", { type: "actor" })
 * ```
 */
export function participant(
  name: string,
  options?: { type?: TimingParticipantType }
): TimingParticipant {
  return {
    id: createDeterministicId(["timing-participant", name], { prefix: "tpart", length: 8 }),
    kind: "timing-participant",
    name,
    ...(options?.type ? { participantType: options.type } : {}),
  };
}

/**
 * Create a timing diagram state.
 *
 * @param name - State name
 * @param options - Optional color
 * @returns A compiled TimingState
 *
 * @example
 * ```ts
 * state("Idle")
 * state("Active", { color: "#22c55e" })
 * ```
 */
export function state(name: string, options?: { color?: string }): TimingState {
  return {
    id: createDeterministicId(["timing-state", name], { prefix: "tstate", length: 8 }),
    kind: "timing-state",
    name,
    ...(options?.color ? { color: options.color } : {}),
  };
}

/**
 * Create a timing diagram transition.
 *
 * @param participantName - Participant name
 * @param fromStateName - Source state name
 * @param toStateName - Target state name
 * @param options - Time position and optional message
 * @returns A compiled TimingTransition
 *
 * @example
 * ```ts
 * transition("Alice", "Idle", "Active", { atTime: 1, message: "start" })
 * ```
 */
export function transition(
  participantName: string,
  fromStateName: string,
  toStateName: string,
  options: { atTime: number; message?: string }
): TimingTransition {
  return {
    id: createDeterministicId(
      ["timing-transition", participantName, fromStateName, toStateName, options.atTime],
      { prefix: "ttrans", length: 8 }
    ),
    kind: "timing-transition",
    participantName,
    fromStateName,
    toStateName,
    atTime: options.atTime,
    ...(options.message ? { message: options.message } : {}),
  };
}

/**
 * Create a timing diagram message between participants.
 *
 * @param sourceName - Source participant name
 * @param targetName - Target participant name
 * @param atTime - Time position
 * @param options - Optional label
 * @returns A compiled TimingMessage
 *
 * @example
 * ```ts
 * message("Alice", "Bob", 2, { label: "request" })
 * ```
 */
export function message(
  sourceName: string,
  targetName: string,
  atTime: number,
  options?: { label?: string }
): TimingMessage {
  return {
    id: createDeterministicId(["timing-message", sourceName, targetName, atTime], {
      prefix: "tmsg",
      length: 8,
    }),
    kind: "timing-message",
    sourceName,
    targetName,
    atTime,
    ...(options?.label ? { label: options.label } : {}),
  };
}
