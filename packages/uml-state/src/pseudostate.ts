import { createDeterministicId } from "@drawspec/core";
import { MutableTransitionLabelBuilder } from "./state";
import type {
  PseudostateElement,
  PseudostateKind,
  StateTransitionTarget,
  Transition,
  TransitionLabelBuilder,
} from "./types";

class MutablePseudostateElement implements PseudostateElement {
  readonly id: string;
  readonly name: string;
  readonly kind = "pseudostate";
  readonly pseudostate: PseudostateKind;
  readonly transitions: Transition[] = [];

  constructor(pseudostate: PseudostateKind, name: string) {
    this.name = name;
    this.pseudostate = pseudostate;
    this.id = createDeterministicId(
      { kind: "pseudostate", name, pseudostate },
      { prefix: "state", length: 10 }
    );
  }

  to(target: StateTransitionTarget, label?: string): TransitionLabelBuilder {
    const targetRef = typeof target === "string" ? target : target.id;
    const transition = {
      id: createDeterministicId(
        { index: this.transitions.length, sourceId: this.id, targetRef },
        { prefix: "transition", length: 10 }
      ),
      sourceId: this.id,
      targetRef,
    } satisfies Transition;
    if (label !== undefined) {
      (transition as { label?: string }).label = label;
    }
    this.transitions.push(transition);
    return new MutableTransitionLabelBuilder(transition);
  }
}

export function initial(name = "initial"): PseudostateElement {
  return new MutablePseudostateElement("initial", name);
}

export function final(name = "final"): PseudostateElement {
  return new MutablePseudostateElement("final", name);
}
