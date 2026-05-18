import { compileSequenceDocument } from "./compile";
import type {
  SequenceActor,
  SequenceBuilder,
  SequenceDocument,
  SequenceDomainModel,
  SequenceElement,
  SequenceFragment,
  SequenceFragmentBuilder,
  SequenceFragmentChild,
  SequenceFragmentOperand,
  SequenceMessage,
  SequenceNote,
  SequenceParticipant,
  SequenceRole,
} from "./types";

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

function deterministicId(prefix: string, parts: readonly string[]): string {
  let hash = FNV_OFFSET_BASIS;
  const input = parts.join("\u001f");

  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * FNV_PRIME) & UINT64_MASK;
  }

  return `${prefix}_${hash.toString(16).padStart(16, "0")}`;
}

class MutableSequenceElement implements SequenceElement {
  readonly id: string;
  readonly name: string;
  readonly role: SequenceRole;
  readonly notes: SequenceNote[] = [];
  readonly #builder: MutableSequenceBuilder;

  constructor(role: SequenceRole, name: string, index: number, builder: MutableSequenceBuilder) {
    this.role = role;
    this.name = name;
    this.#builder = builder;
    this.id = deterministicId("seq", ["element", role, name, index.toString()]);
  }

  to(other: SequenceElement, label: string): SequenceMessage {
    return this.#builder.message(this, other, label);
  }

  note(text: string): this {
    this.notes.push(this.#builder.note(this.id, text));
    return this;
  }
}

class MutableSequenceMessage implements SequenceMessage {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label: string;
  readonly notes: SequenceNote[] = [];
  readonly #builder: MutableSequenceBuilder;

  constructor(
    sourceId: string,
    targetId: string,
    label: string,
    index: number,
    builder: MutableSequenceBuilder
  ) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.label = label;
    this.#builder = builder;
    this.id = deterministicId("msg", ["message", sourceId, targetId, label, index.toString()]);
  }

  note(text: string): this {
    this.notes.push(this.#builder.note(this.id, text));
    return this;
  }
}

class MutableSequenceFragment implements SequenceFragment {
  readonly id: string;
  readonly kind = "alt";
  readonly operands: SequenceFragmentOperand[];

  constructor(index: number, operands: SequenceFragmentOperand[]) {
    this.id = deterministicId("frag", ["fragment", "alt", index.toString()]);
    this.operands = operands;
  }
}

class MutableSequenceFragmentBuilder implements SequenceFragmentBuilder {
  readonly #builder: MutableSequenceBuilder;
  readonly #fragment: MutableSequenceFragment;

  constructor(builder: MutableSequenceBuilder, fragment: MutableSequenceFragment) {
    this.#builder = builder;
    this.#fragment = fragment;
  }

  else(condition: string, callback: (sequence: SequenceBuilder) => void): SequenceFragmentBuilder {
    const children = this.#builder.capture(callback);
    this.#fragment.operands.push({ condition, children });
    return this;
  }
}

class MutableSequenceBuilder implements SequenceBuilder {
  readonly title: string;
  readonly elements: SequenceElement[] = [];
  readonly rootChildren: SequenceFragmentChild[] = [];
  #activeChildren: SequenceFragmentChild[] = this.rootChildren;
  #elementCount = 0;
  #messageCount = 0;
  #fragmentCount = 0;
  #noteCount = 0;

  constructor(title: string) {
    this.title = title;
  }

  actor(name: string): SequenceActor {
    return this.element("actor", name) as SequenceActor;
  }

  participant(name: string): SequenceParticipant {
    return this.element("participant", name) as SequenceParticipant;
  }

  alt(condition: string, callback: (sequence: SequenceBuilder) => void): SequenceFragmentBuilder {
    const firstOperand = { condition, children: this.capture(callback) };
    const fragment = new MutableSequenceFragment(this.#fragmentCount, [firstOperand]);
    this.#fragmentCount += 1;
    this.#activeChildren.push(fragment);
    return new MutableSequenceFragmentBuilder(this, fragment);
  }

  message(source: SequenceElement, target: SequenceElement, label: string): SequenceMessage {
    const message = new MutableSequenceMessage(
      source.id,
      target.id,
      label,
      this.#messageCount,
      this
    );
    this.#messageCount += 1;
    this.#activeChildren.push(message);
    return message;
  }

  note(targetId: string, text: string): SequenceNote {
    const note = {
      id: deterministicId("note", ["note", targetId, text, this.#noteCount.toString()]),
      targetId,
      text,
    };
    this.#noteCount += 1;
    return note;
  }

  capture(callback: (sequence: SequenceBuilder) => void): SequenceFragmentChild[] {
    const parentChildren = this.#activeChildren;
    const children: SequenceFragmentChild[] = [];
    this.#activeChildren = children;
    callback(this);
    this.#activeChildren = parentChildren;
    return children;
  }

  toModel(): SequenceDomainModel {
    return {
      id: deterministicId("seqdoc", ["document", this.title]),
      title: this.title,
      elements: this.elements,
      children: this.rootChildren,
    };
  }

  private element(role: SequenceRole, name: string): SequenceElement {
    const element = new MutableSequenceElement(role, name, this.#elementCount, this);
    this.#elementCount += 1;
    this.elements.push(element);
    return element;
  }
}

export function sequence(
  title: string,
  callback?: (sequence: SequenceBuilder) => void
): SequenceDocument {
  const builder = new MutableSequenceBuilder(title);
  callback?.(builder);
  return compileSequenceDocument(builder.toModel());
}
