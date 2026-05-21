import type { ArchitectureElement, Workspace } from "./types";

export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: "Component";
  readonly type: string;
  readonly tags: readonly string[];
  readonly dependencies: readonly string[];
  readonly metadata: {
    readonly description?: string;
    readonly technology?: string;
    readonly owner?: string;
  };
}

export interface DependencyMatrix {
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly service: string;
    readonly dependencies: readonly boolean[];
  }[];
}

export type ElementClassifier = (element: ArchitectureElement) => string;
export type ClassifiedElements = Record<string, ArchitectureElement[]>;

const SERVICE_KINDS = new Set(["system", "softwareSystem", "container", "service"]);

export function extractServices(model: Workspace): CatalogEntry[] {
  const allElements = flattenElements(model.model.elements).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const services = allElements.filter(isServiceLike);

  return services.map((element) => ({
    id: element.id,
    name: element.name,
    kind: "Component",
    type: String(element.kind),
    tags: [...element.tags].sort(),
    dependencies: dependenciesFor(model, element).sort((a, b) => a.localeCompare(b)),
    metadata: catalogMetadata(element),
  }));
}

export function generateDependencyMatrix(
  model: Workspace,
  services: CatalogEntry[] = extractServices(model)
): DependencyMatrix {
  const orderedServices = [...services].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  );
  const headers = orderedServices.map((service) => service.name);
  const serviceIds = orderedServices.map((service) => service.id);

  return {
    headers,
    rows: orderedServices.map((service) => {
      const dependencyIds = new Set(service.dependencies);
      return {
        service: service.name,
        dependencies: serviceIds.map((id) => dependencyIds.has(id)),
      };
    }),
  };
}

export function classifyElements(
  model: Workspace,
  classifier: ElementClassifier = (element) => String(element.kind)
): ClassifiedElements {
  const classified: ClassifiedElements = {};
  const allElements = flattenElements(model.model.elements).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  for (const element of allElements) {
    const category = classifier(element);
    classified[category] ??= [];
    classified[category].push(element);
  }

  return Object.fromEntries(Object.entries(classified).sort(([a], [b]) => a.localeCompare(b)));
}

export function exportCatalogJson(model: Workspace): string {
  const services = extractServices(model).sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(services, null, 2);
}

export function exportCatalogYaml(model: Workspace): string {
  return extractServices(model)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(toBackstageYaml)
    .join("\n");
}

function flattenElements(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  const result: ArchitectureElement[] = [];
  const stack = [...elements].reverse();

  while (stack.length > 0) {
    const element = stack.pop();
    if (element === undefined) break;

    result.push(element);
    for (let i = element.children.length - 1; i >= 0; i--) {
      const child = element.children[i];
      if (child !== undefined) stack.push(child);
    }
  }

  return result;
}

function isServiceLike(element: ArchitectureElement): boolean {
  return SERVICE_KINDS.has(String(element.kind)) || element.tags.includes("service");
}

function dependenciesFor(model: Workspace, element: ArchitectureElement): string[] {
  const dependencies = new Set<string>();

  for (const relationship of model.model.relationships) {
    if (relationship.source.id === element.id) {
      dependencies.add(relationship.target.id);
    }
  }

  return [...dependencies];
}

function catalogMetadata(element: ArchitectureElement): CatalogEntry["metadata"] {
  const owner = ownerName(element.owner);

  return {
    ...(element.description !== undefined ? { description: element.description } : {}),
    ...(element.technology !== undefined ? { technology: element.technology } : {}),
    ...(owner !== undefined ? { owner } : {}),
  };
}

function ownerName(owner: ArchitectureElement["owner"]): string | undefined {
  if (owner === undefined) return undefined;
  if (typeof owner === "string") return owner;
  return owner.team ?? owner.individual ?? owner.escalation;
}

function toBackstageYaml(entry: CatalogEntry): string {
  const lines = [
    "---",
    "apiVersion: backstage.io/v1alpha1",
    "kind: Component",
    "metadata:",
    `  name: ${yamlString(entry.id)}`,
  ];

  if (entry.metadata.description !== undefined) {
    lines.push(`  description: ${yamlString(entry.metadata.description)}`);
  }

  if (entry.tags.length > 0) {
    lines.push(`  tags: [${entry.tags.map(yamlString).join(", ")}]`);
  }

  lines.push(
    "spec:",
    `  type: ${yamlString(toBackstageType(entry.type))}`,
    "  lifecycle: production"
  );
  lines.push(`  owner: ${yamlString(entry.metadata.owner ?? "unknown")}`);

  if (entry.dependencies.length > 0) {
    lines.push("  dependsOn:");
    for (const dependency of entry.dependencies) {
      lines.push(`    - component:${dependency}`);
    }
  }

  return lines.join("\n");
}

function toBackstageType(type: string): string {
  return type === "softwareSystem" || type === "system" ? "service" : type;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}
