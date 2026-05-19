import { createDeterministicId } from "@drawspec/core";
import type {
  StateBuilder,
  StateElement,
  StateTransitionTarget,
  Transition,
  TransitionLabelBuilder,
} from "./types";

function transitionTargetRef(target: StateTransitionTarget): string {
  return typeof target === "string" ? target : target.id;
}

export class MutableTransitionLabelBuilder implements TransitionLabelBuilder {
  readonly transition: Transition;

  constructor(transition: Transition) {
    this.transition = transition;
  }

  label(text: string): Transition {
    (this.transition as { label?: string }).label = text;
    return this.transition;
  }
}

export class MutableStateElement implements StateElement {
  readonly id: string;
  readonly name: string;
  readonly kind = "state";
  readonly transitions: Transition[] = [];

  constructor(name: string, index = 0) {
    this.name = name;
    this.id = createDeterministicId(
      { kind: "state", name, index },
      { prefix: "state", length: 10 }
    );
  }

  to(target: StateTransitionTarget, label?: string): TransitionLabelBuilder {
    const targetRef = transitionTargetRef(target);
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

export function state(
  name: string,
  callback?: (state: StateBuilder) => undefined | readonly unknown[]
): StateElement {
  const element = new MutableStateElement(name);
  callback?.(element);
  return element;
}
