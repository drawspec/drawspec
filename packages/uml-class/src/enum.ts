import { createDeterministicId } from "@drawspec/core";
import type { EnumBuilder, EnumElement } from "./types";

export class MutableEnumBuilder implements EnumBuilder {
  readonly #name: string;
  readonly #values: string[] = [];

  constructor(name: string) {
    this.#name = name;
  }

  value(name: string): EnumBuilder {
    this.#values.push(name);
    return this;
  }

  toElement(): EnumElement {
    return {
      id: createDeterministicId(["enum", this.#name], { prefix: "enum", length: 8 }),
      kind: "enum",
      name: this.#name,
      values: this.#values,
    };
  }
}

export function enum_(name: string, callback?: (builder: EnumBuilder) => void): EnumElement {
  const builder = new MutableEnumBuilder(name);
  callback?.(builder);
  return builder.toElement();
}
