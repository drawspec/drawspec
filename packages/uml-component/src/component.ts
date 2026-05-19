import { compileComponentDiagramDocument } from "./compile";
import type {
  ComponentBuilder,
  ComponentDiagramDocument,
  ComponentDiagramDomainModel,
  ComponentDiagramElement,
  ComponentElement,
  DependencyEdge,
} from "./types";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function deterministicId(prefix: string, parts: readonly string[]): string {
  let hash = FNV_OFFSET_BASIS;
  const input = parts.join("\u001f");

  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), FNV_PRIME) >>> 0;
  }

  return `${prefix}_${hash.toString(16).padStart(8, "0")}`;
}

class MutableComponent implements ComponentElement, ComponentBuilder {
  readonly id: string;
  readonly kind = "component";
  readonly name: string;
  readonly providedInterfaces: Array<{ readonly name: string }> = [];
  readonly requiredInterfaces: Array<{ readonly name: string }> = [];

  constructor(name: string, index: number) {
    this.name = name;
    this.id = deterministicId("cmp", ["component", name, index.toString()]);
  }

  provides(name: string): this {
    this.providedInterfaces.push({ name });
    return this;
  }

  requires(name: string): this {
    this.requiredInterfaces.push({ name });
    return this;
  }
}

class MutableComponentDiagramBuilder {
  readonly title: string;
  readonly elements: ComponentDiagramElement[] = [];
  #componentCount = 0;
  #edgeCount = 0;

  constructor(title: string) {
    this.title = title;
  }

  add(element: ComponentDiagramElement): void {
    this.elements.push(element);
  }

  component(name: string, configure?: (component: ComponentBuilder) => void): ComponentElement {
    const element = new MutableComponent(name, this.#componentCount);
    this.#componentCount += 1;
    configure?.(element);
    this.add(element);
    return element;
  }

  dependency(sourceName: string, targetName: string, label?: string): DependencyEdge {
    const edge = dependency(sourceName, targetName, label, this.#edgeCount);
    this.#edgeCount += 1;
    this.add(edge);
    return edge;
  }

  toModel(): ComponentDiagramDomainModel {
    return {
      id: deterministicId("cmpdoc", ["document", this.title]),
      title: this.title,
      elements: this.elements,
    };
  }
}

export function component(
  name: string,
  configure?: (component: ComponentBuilder) => void
): ComponentElement {
  const element = new MutableComponent(name, 0);
  configure?.(element);
  return element;
}

export function dependency(
  sourceName: string,
  targetName: string,
  label?: string,
  index = 0
): DependencyEdge {
  return {
    id: deterministicId("dep", [
      "dependency",
      sourceName,
      targetName,
      label ?? "",
      index.toString(),
    ]),
    kind: "dependency",
    sourceName,
    targetName,
    ...(label === undefined ? {} : { label }),
  };
}

export function componentDiagram(
  title: string,
  callback?: (diagram: {
    component: MutableComponentDiagramBuilder["component"];
    dependency: MutableComponentDiagramBuilder["dependency"];
    add: MutableComponentDiagramBuilder["add"];
  }) => void
): ComponentDiagramDocument {
  const builder = new MutableComponentDiagramBuilder(title);
  callback?.({
    component: builder.component.bind(builder),
    dependency: builder.dependency.bind(builder),
    add: builder.add.bind(builder),
  });

  return compileComponentDiagramDocument(builder.toModel());
}
