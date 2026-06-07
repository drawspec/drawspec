import { createDeterministicId } from "@drawspec/core";
import type { ObjectAttribute, ObjectBuilder, ObjectInstance } from "./types";

/** Mutable builder for constructing object instances with a fluent API. */
export class MutableObjectBuilder implements ObjectBuilder {
  readonly #name: string;
  readonly #className: string | undefined;
  readonly #attributes: ObjectAttribute[] = [];

  constructor(name: string, className?: string) {
    this.#name = name;
    this.#className = className;
  }

  attribute(name: string, value: string): ObjectBuilder {
    this.#attributes.push({
      id: createDeterministicId(["object-attr", this.#name, name, this.#attributes.length], {
        prefix: "attr",
        length: 8,
      }),
      name,
      value,
    });
    return this;
  }

  toInstance(): ObjectInstance {
    return {
      id: createDeterministicId(["object", this.#name], { prefix: "obj", length: 8 }),
      kind: "object",
      name: this.#name,
      ...(this.#className ? { className: this.#className } : {}),
      attributes: this.#attributes,
    };
  }
}

/**
 * Create an object instance element.
 *
 * @param name - Object instance name
 * @param options - Optional class name and attributes callback
 * @returns A compiled ObjectInstance ready for diagram inclusion
 *
 * @example
 * ```ts
 * object("user1", { className: "User" }, (o) =>
 *   o.attribute("name", "Alice").attribute("age", "30")
 * )
 * ```
 */
export function object(
  name: string,
  options?: { className?: string },
  callback?: (builder: ObjectBuilder) => void
): ObjectInstance {
  const builder = new MutableObjectBuilder(name, options?.className);
  callback?.(builder);
  return builder.toInstance();
}
