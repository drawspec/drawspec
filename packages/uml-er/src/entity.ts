import { createDeterministicId } from "@drawspec/core";
import type { AttributeOptions, EntityBuilder, ErAttribute, ErEntity } from "./types";

/** Mutable builder for constructing ER entities with a fluent API. */
export class MutableEntityBuilder implements EntityBuilder {
  readonly #name: string;
  readonly #attributes: ErAttribute[] = [];

  constructor(name: string) {
    this.#name = name;
  }

  attribute(name: string, type: string, options: AttributeOptions = {}): EntityBuilder {
    this.#attributes.push({
      id: createDeterministicId(["er-attribute", this.#name, name, this.#attributes.length], {
        prefix: "attr",
        length: 8,
      }),
      name,
      type,
      ...(options.constraint ? { constraint: options.constraint } : {}),
      ...(options.nullable !== undefined ? { nullable: options.nullable } : {}),
    });
    return this;
  }

  pk(name: string, type: string): EntityBuilder {
    return this.attribute(name, type, { constraint: "pk" });
  }

  fk(name: string, type: string): EntityBuilder {
    return this.attribute(name, type, { constraint: "fk" });
  }

  toEntity(): ErEntity {
    return {
      id: createDeterministicId(["er-entity", this.#name], { prefix: "entity", length: 8 }),
      kind: "entity",
      name: this.#name,
      attributes: this.#attributes,
    };
  }
}

/**
 * Create an ER entity element.
 *
 * @param name - Entity name (e.g. "User", "Order")
 * @param callback - Optional builder callback for adding attributes
 * @returns A compiled ErEntity ready for diagram inclusion
 *
 * @example
 * ```ts
 * entity("User", (e) =>
 *   e.pk("id", "UUID")
 *     .attribute("email", "VARCHAR(255)")
 *     .fk("orgId", "UUID")
 * )
 * ```
 */
export function entity(name: string, callback?: (builder: EntityBuilder) => void): ErEntity {
  const builder = new MutableEntityBuilder(name);
  callback?.(builder);
  return builder.toEntity();
}
