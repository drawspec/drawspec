import { createDeterministicId } from "@drawspec/core";
import type {
  ArchitectureElement,
  ArchitectureView,
  ArchitectureViewKind,
  ArchitectureViews,
  AutoLayoutDirection,
} from "./types";

export class ArchitectureViewImpl implements ArchitectureView {
  readonly id: string;
  readonly kind: ArchitectureViewKind;
  readonly key: string;
  readonly title: string;
  readonly subject: ArchitectureElement;
  readonly includedElements: ArchitectureElement[] = [];
  #includeAll = false;
  #layoutDirection: AutoLayoutDirection | undefined;

  constructor(kind: ArchitectureViewKind, subject: ArchitectureElement, key: string) {
    this.kind = kind;
    this.subject = subject;
    this.key = key;
    this.title = key;
    this.id = createDeterministicId({ kind, subjectId: subject.id, key }, { prefix: "view" });
  }

  get includeAll(): boolean {
    return this.#includeAll;
  }

  get layoutDirection(): AutoLayoutDirection | undefined {
    return this.#layoutDirection;
  }

  include(...elements: (ArchitectureElement | "*")[]): this {
    for (const element of elements) {
      if (element === "*") {
        this.#includeAll = true;
      } else if (!this.includedElements.some((candidate) => candidate.id === element.id)) {
        this.includedElements.push(element);
      }
    }
    return this;
  }

  autoLayout(direction: AutoLayoutDirection): this {
    this.#layoutDirection = direction;
    return this;
  }
}

export class ArchitectureViewsImpl implements ArchitectureViews {
  readonly items: ArchitectureView[] = [];

  systemContext(
    subject: ArchitectureElement,
    key = `${subject.id}-context`,
    configure?: (view: ArchitectureView) => void
  ): ArchitectureView {
    const view = new ArchitectureViewImpl("systemContext", subject, key);
    configure?.(view);
    this.items.push(view);
    return view;
  }

  container(
    subject: ArchitectureElement,
    key = `${subject.id}-containers`,
    configure?: (view: ArchitectureView) => void
  ): ArchitectureView {
    const view = new ArchitectureViewImpl("container", subject, key);
    configure?.(view);
    this.items.push(view);
    return view;
  }
}
