import { createDeterministicId } from "@drawspec/core";
import { compileWorkspace } from "./compile";
import { type ArchitectureElementImpl, isArchitectureElementImpl } from "./elements";
import { ArchitectureRelationshipImpl } from "./relationships";
import { ArchitectureStylesImpl } from "./styles";
import type {
  ArchitectureElement,
  ArchitectureModel,
  ArchitectureRelationship,
  ArchitectureRelationshipOptions,
  Workspace,
  WorkspaceInitializer,
} from "./types";
import { ArchitectureViewsImpl } from "./views";

function allocateUnique(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  let candidate = `${base}_${suffix}`;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
  used.add(candidate);
  return candidate;
}

class ArchitectureModelImpl implements ArchitectureModel {
  readonly elements: ArchitectureElement[] = [];
  readonly relationships: ArchitectureRelationship[] = [];
  readonly importedModels: ArchitectureModel[] = [];
  #ids = new Set<string>();

  add<T extends ArchitectureElement>(element: T): T {
    if (!isArchitectureElementImpl(element)) {
      throw new Error("Architecture elements must be created by @drawspec/architecture builders.");
    }
    this.elements.push(element);
    this.attachElement(element, undefined);
    return element;
  }

  use(model: ArchitectureModel): void {
    this.importedModels.push(model);
  }

  attachElement(
    element: ArchitectureElementImpl,
    parent: ArchitectureElementImpl | undefined
  ): void {
    const base =
      element.requestedId ??
      createDeterministicId(
        { kind: element.kind, name: element.name, parentId: parent?.id },
        { prefix: element.kind }
      );
    const id = allocateUnique(base, this.#ids);
    element.attach(this, parent, id);
  }

  addRelationship(
    source: ArchitectureElement,
    target: ArchitectureElement,
    label: string,
    options: ArchitectureRelationshipOptions = {}
  ): ArchitectureRelationship {
    const base =
      options.id ??
      createDeterministicId(
        {
          kind: "uses",
          sourceId: source.id,
          targetId: target.id,
          label,
          technology: options.technology,
        },
        { prefix: "rel" }
      );
    const id = allocateUnique(base, this.#ids);
    const { id: _requestedId, ...optionsWithoutId } = options;
    const relationship = new ArchitectureRelationshipImpl(
      id,
      source,
      target,
      label,
      optionsWithoutId
    );
    this.relationships.push(relationship);
    return relationship;
  }
}

export class WorkspaceImpl implements Workspace {
  readonly id: string;
  readonly name: string;
  readonly model = new ArchitectureModelImpl();
  readonly views = new ArchitectureViewsImpl();
  readonly styles = new ArchitectureStylesImpl();

  constructor(name: string) {
    this.name = name;
    this.id = createDeterministicId({ kind: "workspace", name }, { prefix: "workspace" });
  }

  compile() {
    return compileWorkspace(this);
  }
}

export function workspace(name: string, initializer: WorkspaceInitializer): Workspace;
export function workspace(name: string): (initializer: WorkspaceInitializer) => Workspace;
export function workspace(
  name: string,
  initializer?: WorkspaceInitializer
): Workspace | ((initializer: WorkspaceInitializer) => Workspace) {
  const create = (setup: WorkspaceInitializer): Workspace => {
    const ws = new WorkspaceImpl(name);
    setup(ws);
    return ws;
  };

  return initializer === undefined ? create : create(initializer);
}
