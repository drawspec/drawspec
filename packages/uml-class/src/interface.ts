import { createDeterministicId } from "@drawspec/core";
import type { ClassMethod, ClassMethodOptions, InterfaceBuilder, InterfaceElement } from "./types";

export class MutableInterfaceBuilder implements InterfaceBuilder {
  readonly #name: string;
  readonly #methods: ClassMethod[] = [];
  readonly #interfaceNames: string[] = [];

  constructor(name: string) {
    this.#name = name;
  }

  method(name: string, options: ClassMethodOptions = {}): InterfaceBuilder {
    this.#methods.push({
      id: createDeterministicId(["interface-method", this.#name, name, this.#methods.length], {
        prefix: "method",
        length: 8,
      }),
      name,
      ...(options.visibility ? { visibility: options.visibility } : {}),
      ...(options.static !== undefined ? { static: options.static } : {}),
      ...(options.abstract !== undefined ? { abstract: options.abstract } : {}),
      ...(options.returnType ? { returnType: options.returnType } : {}),
      parameters: options.parameters ?? [],
    });
    return this;
  }

  implements(name: string): InterfaceBuilder {
    this.#interfaceNames.push(name);
    return this;
  }

  toElement(): InterfaceElement {
    return {
      id: createDeterministicId(["interface", this.#name], { prefix: "iface", length: 8 }),
      kind: "interface",
      name: this.#name,
      methods: this.#methods,
      interfaceNames: this.#interfaceNames,
    };
  }
}

export function interface_(
  name: string,
  callback?: (builder: InterfaceBuilder) => void
): InterfaceElement {
  const builder = new MutableInterfaceBuilder(name);
  callback?.(builder);
  return builder.toElement();
}
