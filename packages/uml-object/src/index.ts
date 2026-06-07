import { createDeterministicId } from "@drawspec/core";
import { object } from "./builders";
import { compileObjectDocument } from "./compile";
import { link } from "./link";
import type {
  ObjectDiagramElement,
  ObjectDocument,
  ObjectDomainModel,
  ObjectInstance,
  ObjectLink,
} from "./types";

export { MutableObjectBuilder, object } from "./builders";
export { compile, compileObjectDocument } from "./compile";
export { link } from "./link";
export type {
  ObjectAttribute,
  ObjectBuilder,
  ObjectDiagramElement,
  ObjectDocument,
  ObjectDomainModel,
  ObjectInstance,
  ObjectLink,
} from "./types";

/** API exposed inside the {@link objectDiagram} callback. */
export interface ObjectDiagramBuilderApi {
  object: typeof object;
  link: typeof link;
}

/**
 * Build a complete object diagram with a callback-based DSL.
 *
 * @param title - Diagram title
 * @param callback - Builder callback receiving the DSL API
 * @returns A compiled ObjectDocument ready for layout and rendering
 *
 * @example
 * ```ts
 * objectDiagram("Order System", (dsl) => [
 *   dsl.object("user1", { className: "User" }, (o) =>
 *     o.attribute("name", "Alice").attribute("age", "30")
 *   ),
 *   dsl.object("order1", { className: "Order" }, (o) =>
 *     o.attribute("total", "$99.99")
 *   ),
 *   dsl.link("user1", "order1", { label: "places" }),
 * ])
 * ```
 */
export function objectDiagram(
  title: string,
  callback: (api: ObjectDiagramBuilderApi) => readonly ObjectDiagramElement[]
): ObjectDocument {
  const api: ObjectDiagramBuilderApi = { object, link };
  const entries = callback(api);

  const instances = entries.filter((entry): entry is ObjectInstance => entry.kind === "object");
  const links = entries.filter((entry): entry is ObjectLink => entry.kind === "link");

  const model: ObjectDomainModel = {
    id: createDeterministicId(["object-document", title], { prefix: "objdoc", length: 8 }),
    title,
    instances,
    links,
  };

  return compileObjectDocument(model);
}
