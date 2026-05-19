import { createDeterministicId } from "@drawspec/core";
import type {
  ClassBuilder,
  ClassElement,
  ClassField,
  ClassFieldOptions,
  ClassMethod,
  ClassMethodOptions,
} from "./types";

export class MutableClassBuilder implements ClassBuilder {
  readonly #name: string;
  readonly #fields: ClassField[] = [];
  readonly #methods: ClassMethod[] = [];
  readonly #interfaceNames: string[] = [];
  readonly #usedTypeNames: string[] = [];
  #extendsName: string | undefined;
  #isAbstract = false;

  constructor(name: string) {
    this.#name = name;
  }

  field(name: string, type: string, options: ClassFieldOptions = {}): ClassBuilder {
    this.#fields.push({
      id: createDeterministicId(["class-field", this.#name, name, this.#fields.length], {
        prefix: "field",
        length: 8,
      }),
      name,
      type,
      ...(options.visibility ? { visibility: options.visibility } : {}),
      ...(options.static !== undefined ? { static: options.static } : {}),
      ...(options.readonly !== undefined ? { readonly: options.readonly } : {}),
    });
    return this;
  }

  method(name: string, options: ClassMethodOptions = {}): ClassBuilder {
    this.#methods.push({
      id: createDeterministicId(["class-method", this.#name, name, this.#methods.length], {
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

  extends(name: string): ClassBuilder {
    this.#extendsName = name;
    return this;
  }

  implements(name: string): ClassBuilder {
    this.#interfaceNames.push(name);
    return this;
  }

  uses(name: string): ClassBuilder {
    this.#usedTypeNames.push(name);
    return this;
  }

  abstract(): ClassBuilder {
    this.#isAbstract = true;
    return this;
  }

  toElement(): ClassElement {
    return {
      id: createDeterministicId(["class", this.#name], { prefix: "class", length: 8 }),
      kind: "class",
      name: this.#name,
      fields: this.#fields,
      methods: this.#methods,
      interfaceNames: this.#interfaceNames,
      usedTypeNames: this.#usedTypeNames,
      abstract: this.#isAbstract,
      ...(this.#extendsName ? { extendsName: this.#extendsName } : {}),
    };
  }
}

export function class_(name: string, callback?: (builder: ClassBuilder) => void): ClassElement {
  const builder = new MutableClassBuilder(name);
  callback?.(builder);
  return builder.toElement();
}
