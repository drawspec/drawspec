import type {
  ArchitectureElement,
  ArchitectureElementOptions,
  ArchitectureModel,
  ArchitectureRelationship,
  ArchitectureRelationshipOptions,
  C4ElementKind,
  OwnerMetadata,
} from "./types";

interface MutableArchitectureModel extends ArchitectureModel {
  attachElement(
    element: ArchitectureElementImpl,
    parent: ArchitectureElementImpl | undefined
  ): void;
  addRelationship(
    source: ArchitectureElement,
    target: ArchitectureElement,
    label: string,
    options?: ArchitectureRelationshipOptions
  ): ArchitectureRelationship;
}

function sortedUnique(values: readonly string[] = []): string[] {
  return [...new Set(values)].sort();
}

function freezeMetadata(options: ArchitectureElementOptions): Record<string, unknown> {
  return Object.freeze({ ...options.metadata });
}
export class ArchitectureElementImpl implements ArchitectureElement {
  readonly kind: C4ElementKind;
  readonly name: string;
  readonly description: string | undefined;
  readonly technology: string | undefined;
  readonly owner: string | OwnerMetadata | undefined;
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly requestedId: string | undefined;

  #id: string | undefined;
  #parent: ArchitectureElementImpl | undefined;
  #model: MutableArchitectureModel | undefined;
  #children: ArchitectureElementImpl[] = [];

  constructor(kind: C4ElementKind, name: string, options: ArchitectureElementOptions = {}) {
    this.kind = kind;
    this.name = name;
    this.description = options.description;
    this.technology = options.technology;
    this.owner = options.owner;
    this.tags = Object.freeze(sortedUnique([this.kind, ...(options.tags ?? [])]));
    this.metadata = freezeMetadata(options);
    this.properties = Object.freeze({ ...options.properties });
    this.requestedId = options.id;
  }

  get id(): string {
    if (this.#model === undefined) {
      throw new Error("Cannot access id before element is attached to a model");
    }
    return this.#id as string;
  }

  get parent(): ArchitectureElement | undefined {
    return this.#parent;
  }

  get children(): readonly ArchitectureElement[] {
    return this.#children;
  }

  add<T extends ArchitectureElement>(element: T): T {
    if (!(element instanceof ArchitectureElementImpl)) {
      throw new Error("Architecture elements must be created by @drawspec/architecture builders.");
    }

    this.#children.push(element);
    if (this.#model !== undefined) {
      this.#model.attachElement(element, this);
    } else {
      element.setParent(this);
    }
    return element;
  }

  uses(
    target: ArchitectureElement,
    label: string,
    options?: ArchitectureRelationshipOptions
  ): ArchitectureRelationship {
    if (this.#model === undefined) {
      throw new Error(
        `Element '${this.name}' must be added to a workspace model before creating relationships.`
      );
    }
    return this.#model.addRelationship(this, target, label, options);
  }
  attach(
    model: MutableArchitectureModel,
    parent: ArchitectureElementImpl | undefined,
    id: string
  ): void {
    this.#model = model;
    this.#parent = parent;
    this.#id = id;
    for (const child of this.#children) {
      model.attachElement(child, this);
    }
  }

  setParent(parent: ArchitectureElementImpl): void {
    this.#parent = parent;
  }
}

export function person(name: string, options?: ArchitectureElementOptions): ArchitectureElement {
  return new ArchitectureElementImpl("person", name, options);
}

export function softwareSystem(
  name: string,
  options?: ArchitectureElementOptions
): ArchitectureElement {
  return new ArchitectureElementImpl("softwareSystem", name, options);
}
export function container(name: string, options?: ArchitectureElementOptions): ArchitectureElement {
  return new ArchitectureElementImpl("container", name, options);
}

export function database(name: string, options?: ArchitectureElementOptions): ArchitectureElement {
  return new ArchitectureElementImpl("database", name, options);
}

export function isArchitectureElementImpl(
  element: ArchitectureElement
): element is ArchitectureElementImpl {
  return element instanceof ArchitectureElementImpl;
}
