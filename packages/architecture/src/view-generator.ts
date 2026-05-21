import { createDeterministicId } from "@drawspec/core";
import type {
  ArchitectureElement,
  ArchitectureModel,
  ArchitectureRelationship,
  ArchitectureView,
  ArchitectureViewKind,
  AutoLayoutDirection,
  C4ElementKind,
} from "./types";

type PathDirection = "forward" | "reverse" | "both";
export type ViewElementKind = C4ElementKind | "component";

export type ViewGenerationOptions =
  | TagsViewGenerationOptions
  | KindsViewGenerationOptions
  | PathsViewGenerationOptions
  | AutoViewGenerationOptions;

export interface TagsViewGenerationOptions {
  readonly strategy: "tags";
  readonly include: readonly string[];
  readonly title?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export interface KindsViewGenerationOptions {
  readonly strategy: "kinds";
  readonly include: readonly ViewElementKind[];
  readonly title?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export interface PathsViewGenerationOptions {
  readonly strategy: "paths";
  readonly seeds: readonly string[];
  readonly maxDepth?: number;
  readonly direction?: PathDirection;
  readonly title?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export interface AutoViewGenerationOptions {
  readonly strategy: "auto";
  readonly title?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

class GeneratedArchitectureView implements ArchitectureView {
  readonly id: string;
  readonly kind: ArchitectureViewKind;
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly elements: readonly string[];
  readonly relationships: readonly string[];
  readonly subject: ArchitectureElement;
  readonly includedElements: ArchitectureElement[];
  readonly includeAll = false;
  #layoutDirection: AutoLayoutDirection | undefined;

  constructor(input: {
    readonly key: string;
    readonly title: string;
    readonly kind?: ArchitectureViewKind;
    readonly subject: ArchitectureElement;
    readonly elements: readonly ArchitectureElement[];
    readonly relationships: readonly ArchitectureRelationship[];
    readonly description?: string | undefined;
    readonly tags?: readonly string[];
  }) {
    this.kind = input.kind ?? "systemContext";
    this.key = input.key;
    this.title = input.title;
    this.subject = input.subject;
    this.includedElements = sortElements(input.elements);
    this.elements = this.includedElements.map((element) => element.id);
    this.relationships = sortRelationships(input.relationships).map(
      (relationship) => relationship.id
    );
    this.id = createDeterministicId(
      {
        kind: this.kind,
        key: this.key,
        elements: this.elements,
        relationships: this.relationships,
        strategy: "generated-view",
        subjectId: this.subject.id,
      },
      { prefix: "view" }
    );
    if (input.description !== undefined) this.description = input.description;
    if (input.tags !== undefined) this.tags = sortedUnique(input.tags);
  }

  get layoutDirection(): AutoLayoutDirection | undefined {
    return this.#layoutDirection;
  }

  include(...elements: (ArchitectureElement | "*")[]): this {
    if (elements.includes("*")) return this;
    const existing = new Set(this.includedElements.map((element) => element.id));
    for (const element of elements) {
      if (element !== "*" && !existing.has(element.id)) {
        this.includedElements.push(element);
        existing.add(element.id);
      }
    }
    this.includedElements.sort(compareById);
    return this;
  }

  autoLayout(direction: AutoLayoutDirection): this {
    this.#layoutDirection = direction;
    return this;
  }
}

export function generateViews(
  model: ArchitectureModel,
  options: ViewGenerationOptions
): ArchitectureView[] {
  switch (options.strategy) {
    case "tags":
      return generateTagView(model, options);
    case "kinds":
      return generateKindView(model, options);
    case "paths":
      return generatePathView(model, options);
    case "auto":
      return generateAutoViews(model, options);
  }
}

function generateTagView(
  model: ArchitectureModel,
  options: TagsViewGenerationOptions
): ArchitectureView[] {
  const includedTags = new Set(options.include);
  const elements = allElements(model).filter((element) =>
    element.tags.some((tag) => includedTags.has(tag))
  );
  return createSingleView({
    key: `tags-${options.include.join("-")}`,
    title: options.title ?? `Elements tagged ${options.include.join(", ")}`,
    description: options.description,
    tags: ["generated", "tags", ...(options.tags ?? [])],
    elements,
    relationships: internalRelationships(model, elements),
  });
}

function generateKindView(
  model: ArchitectureModel,
  options: KindsViewGenerationOptions
): ArchitectureView[] {
  const includedKinds = new Set<string>(options.include);
  const elements = allElements(model).filter((element) => includedKinds.has(element.kind));
  return createSingleView({
    key: `kinds-${options.include.join("-")}`,
    title: options.title ?? `${options.include.join(" and ")} elements`,
    description: options.description,
    tags: ["generated", "kinds", ...(options.tags ?? [])],
    elements,
    relationships: internalRelationships(model, elements),
  });
}

function generatePathView(
  model: ArchitectureModel,
  options: PathsViewGenerationOptions
): ArchitectureView[] {
  const elementsByIdOrName = new Map<string, ArchitectureElement>();
  for (const element of allElements(model)) {
    elementsByIdOrName.set(element.id, element);
    elementsByIdOrName.set(element.name, element);
  }
  const seeds = options.seeds
    .map((seed) => elementsByIdOrName.get(seed))
    .filter((element): element is ArchitectureElement => element !== undefined);
  const result = traverseDependencies(
    model,
    seeds,
    options.maxDepth ?? 1,
    options.direction ?? "forward"
  );

  return createSingleView({
    key: `paths-${options.seeds.join("-")}`,
    title: options.title ?? `Dependency paths from ${options.seeds.join(", ")}`,
    description: options.description,
    tags: ["generated", "paths", ...(options.tags ?? [])],
    elements: result.elements,
    relationships: result.relationships,
  });
}

function generateAutoViews(
  model: ArchitectureModel,
  options: AutoViewGenerationOptions
): ArchitectureView[] {
  const topLevelSystems = sortElements(
    model.elements.filter(
      (element) => element.parent === undefined && element.kind === "softwareSystem"
    )
  );
  const views: ArchitectureView[] = [];

  if (topLevelSystems.length > 0) {
    views.push(
      new GeneratedArchitectureView({
        key: "system-landscape",
        title: options.title ?? "System landscape",
        subject: topLevelSystems[0] as ArchitectureElement,
        elements: topLevelSystems,
        relationships: internalRelationships(model, topLevelSystems),
        description: options.description ?? "Generated view of top-level software systems.",
        tags: ["generated", "auto", "landscape", ...(options.tags ?? [])],
      })
    );
  }

  for (const system of topLevelSystems) {
    const elements = sortElements([system, ...system.children]);
    views.push(
      new GeneratedArchitectureView({
        key: `${system.id}-auto`,
        title: `${system.name} dependencies`,
        kind: system.children.length > 0 ? "container" : "systemContext",
        subject: system,
        elements,
        relationships: internalRelationships(model, elements),
        description: `Generated view of ${system.name} and its direct dependencies.`,
        tags: ["generated", "auto", system.id, ...(options.tags ?? [])],
      })
    );
  }

  return views.sort((left, right) => left.id.localeCompare(right.id));
}

function createSingleView(input: {
  readonly key: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly tags: readonly string[];
  readonly elements: readonly ArchitectureElement[];
  readonly relationships: readonly ArchitectureRelationship[];
}): ArchitectureView[] {
  const elements = sortElements(input.elements);
  if (elements.length === 0) return [];
  return [
    new GeneratedArchitectureView({
      key: input.key,
      title: input.title,
      subject: elements[0] as ArchitectureElement,
      elements,
      relationships: input.relationships,
      description: input.description,
      tags: input.tags,
    }),
  ];
}

function allElements(model: ArchitectureModel): ArchitectureElement[] {
  const result: ArchitectureElement[] = [];
  const stack = [...model.elements].sort(compareById).reverse();
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) break;
    result.push(element);
    const children = [...element.children].sort(compareById).reverse();
    stack.push(...children);
  }
  return result;
}

function internalRelationships(
  model: ArchitectureModel,
  elements: readonly ArchitectureElement[]
): ArchitectureRelationship[] {
  const ids = new Set(elements.map((element) => element.id));
  return sortRelationships(
    model.relationships.filter(
      (relationship) => ids.has(relationship.source.id) && ids.has(relationship.target.id)
    )
  );
}

function traverseDependencies(
  model: ArchitectureModel,
  seeds: readonly ArchitectureElement[],
  maxDepth: number,
  direction: PathDirection
): { elements: ArchitectureElement[]; relationships: ArchitectureRelationship[] } {
  const elements = new Map<string, ArchitectureElement>();
  const relationships = new Map<string, ArchitectureRelationship>();
  const adjacency = buildAdjacency(model, direction);
  const queue: Array<{ element: ArchitectureElement; depth: number }> = seeds.map((element) => ({
    element,
    depth: 0,
  }));

  for (const seed of seeds) elements.set(seed.id, seed);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) continue;
    const neighbors = adjacency.get(current.element.id) ?? [];
    for (const { element, relationship } of neighbors) {
      relationships.set(relationship.id, relationship);
      if (!elements.has(element.id)) {
        elements.set(element.id, element);
        queue.push({ element, depth: current.depth + 1 });
      }
    }
  }

  return {
    elements: sortElements([...elements.values()]),
    relationships: sortRelationships([...relationships.values()]),
  };
}

function buildAdjacency(
  model: ArchitectureModel,
  direction: PathDirection
): Map<string, Array<{ element: ArchitectureElement; relationship: ArchitectureRelationship }>> {
  const adjacency = new Map<
    string,
    Array<{ element: ArchitectureElement; relationship: ArchitectureRelationship }>
  >();
  for (const relationship of sortRelationships(model.relationships)) {
    if (direction === "forward" || direction === "both") {
      addNeighbor(adjacency, relationship.source.id, relationship.target, relationship);
    }
    if (direction === "reverse" || direction === "both") {
      addNeighbor(adjacency, relationship.target.id, relationship.source, relationship);
    }
  }
  for (const neighbors of adjacency.values()) {
    neighbors.sort((left, right) => left.element.id.localeCompare(right.element.id));
  }
  return adjacency;
}

function addNeighbor(
  adjacency: Map<
    string,
    Array<{ element: ArchitectureElement; relationship: ArchitectureRelationship }>
  >,
  fromId: string,
  element: ArchitectureElement,
  relationship: ArchitectureRelationship
): void {
  const neighbors = adjacency.get(fromId) ?? [];
  neighbors.push({ element, relationship });
  adjacency.set(fromId, neighbors);
}

function sortElements(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  return [...elements].sort(compareById);
}

function sortRelationships(
  relationships: readonly ArchitectureRelationship[]
): ArchitectureRelationship[] {
  return [...relationships].sort(compareById);
}

function compareById(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id.localeCompare(right.id);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
