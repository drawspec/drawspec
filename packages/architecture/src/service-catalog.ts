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

/**
 * Normalized service representation for catalog synchronization.
 *
 * This is a catalog-agnostic intermediate format used when pushing or pulling
 * architecture data to/from external service catalogs (Backstage, OpsLevel, etc.).
 * Each service includes identity, classification, ownership, and dependency
 * information needed by most catalog backends.
 */
export interface CatalogSyncService {
  /** Unique identifier for the service within the architecture model */
  readonly id: string;
  /** Human-readable service name */
  readonly name: string;
  /** Service type (e.g. "container", "softwareSystem", "service") */
  readonly type: string;
  /** Optional description of the service */
  readonly description?: string;
  /** Team or individual responsible for the service */
  readonly owner?: string;
  /** Technology stack used by the service */
  readonly technology?: string;
  /** Sorted list of tags for categorization */
  readonly tags: readonly string[];
  /** Sorted list of service IDs this service depends on */
  readonly dependencies: readonly string[];
}

/**
 * Normalized architecture model representation for catalog synchronization.
 *
 * Contains all services extracted from an architecture workspace, ready to be
 * pushed to an external catalog or merged with catalog state pulled from one.
 */
export interface CatalogModel {
  /** Workspace name the model was derived from */
  readonly source: string;
  /** Timestamp of when the model was generated (ISO 8601) */
  readonly generatedAt: string;
  /** Services included in the sync payload */
  readonly services: readonly CatalogSyncService[];
}

/**
 * Details about an individual entity that was created, updated, or failed
 * during a catalog sync push operation.
 */
export interface SyncEntityResult {
  /** Identifier of the synced entity */
  readonly id: string;
  /** Whether this entity was synced successfully */
  readonly success: boolean;
  /** Human-readable description of what changed (e.g. "created", "updated tags") */
  readonly message?: string;
}

/**
 * Result of a catalog sync push or pull operation.
 *
 * Provides an overall success/failure status along with per-entity details
 * so callers can determine exactly what succeeded and what needs attention.
 */
export interface SyncResult {
  /** Whether the overall sync operation succeeded */
  readonly success: boolean;
  /** Number of entities successfully synced */
  readonly syncedCount: number;
  /** Number of entities that failed to sync */
  readonly failedCount: number;
  /** Per-entity results for granular inspection */
  readonly entities: readonly SyncEntityResult[];
  /** Error message when the overall operation failed */
  readonly error?: string;
}

/**
 * Adapter interface for synchronizing architecture model data with an external
 * service catalog.
 *
 * Implementations target specific catalog backends (Backstage, OpsLevel, etc.)
 * and handle the details of authentication, API calls, and data mapping. The
 * interface is designed around a push/pull model:
 *
 * - **push** — send a normalized {@link CatalogModel} to the external catalog
 * - **pull** — retrieve the current catalog state as a {@link CatalogModel}
 * - **validate** — verify that the adapter can connect to its backend
 *
 * All methods are async to accommodate network I/O. Implementations should
 * Throw for unexpected/unrecoverable errors (network failures, authentication
 * errors). Return `{ success: false, error }` for recoverable or partial
 * failures where some entities failed but others succeeded.
 */
export interface CatalogSyncAdapter {
  /** Human-readable name identifying the catalog backend (e.g. "Backstage", "OpsLevel") */
  readonly name: string;

  /**
   * Push a normalized architecture model to the external catalog.
   *
   * The adapter should create or update entities in the catalog to match the
   * provided model. Entities that exist in the catalog but not in the model
   * should be left untouched (this is additive, not destructive).
   *
   * @param model - The normalized catalog model to push.
   * @returns A {@link SyncResult} detailing what was created or updated.
   */
  push(model: CatalogModel): Promise<SyncResult>;

  /**
   * Pull the current state of the external catalog into a normalized model.
   *
   * The returned {@link CatalogModel} uses the same format as the push input,
   * enabling diff-based workflows: pull, compare with a local model, then push
   * only the differences.
   *
   * @returns A normalized catalog model reflecting the current catalog state.
   */
  pull(): Promise<CatalogModel>;

  /**
   * Validate that the adapter can connect to its catalog backend.
   *
   * Should verify credentials and network reachability without performing
   * any write operations. Returns `true` if the adapter is ready to push/pull.
   *
   * @returns `true` if the connection is valid, `false` otherwise.
   */
  validate(): Promise<boolean>;
}

/**
 * A {@link CatalogSyncAdapter} implementation that stores data in memory.
 *
 * Intended for testing and development. Supports configurable validation
 * behavior and tracks all pushed models for inspection.
 */
export class MockSyncAdapter implements CatalogSyncAdapter {
  readonly name = "Mock";
  private readonly models: CatalogModel[] = [];
  private readonly isValid: boolean;

  /**
   * @param options - Configuration for the mock adapter.
   * @param options.valid - Whether {@link validate} should return `true`. Defaults to `true`.
   */
  constructor(options?: { readonly valid?: boolean }) {
    this.isValid = options?.valid ?? true;
  }

  /** Returns all models that have been pushed to this adapter. */
  get pushedModels(): readonly CatalogModel[] {
    return [...this.models];
  }

  async push(model: CatalogModel): Promise<SyncResult> {
    this.models.push(cloneModel(model));
    const entities: SyncEntityResult[] = model.services.map((service) => ({
      id: service.id,
      success: true,
      message: "created",
    }));
    return {
      success: true,
      syncedCount: entities.length,
      failedCount: 0,
      entities,
    };
  }

  async pull(): Promise<CatalogModel> {
    const latest = this.models.at(-1);
    if (latest !== undefined) {
      return cloneModel(latest);
    }
    return {
      source: "mock",
      generatedAt: new Date().toISOString(),
      services: [],
    };
  }

  async validate(): Promise<boolean> {
    return this.isValid;
  }
}

/**
 * Convert extracted catalog entries into a normalized {@link CatalogModel}
 * suitable for pushing to a {@link CatalogSyncAdapter}.
 *
 * @param workspace - The architecture workspace to convert.
 * @returns A normalized catalog model with deterministic ordering.
 */
function optionalField<K extends string, V>(
  key: K,
  value: V | undefined
): Record<K, V> | Record<string, never> {
  return value !== undefined ? ({ [key]: value } as Record<K, V>) : {};
}

export function toCatalogModel(workspace: Workspace): CatalogModel {
  const services = extractServices(workspace).map(
    (entry): CatalogSyncService => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      ...optionalField("description", entry.metadata.description),
      ...optionalField("owner", entry.metadata.owner),
      ...optionalField("technology", entry.metadata.technology),
      tags: entry.tags,
      dependencies: entry.dependencies,
    })
  );
  return {
    source: workspace.name,
    generatedAt: new Date().toISOString(),
    services,
  };
}

function cloneModel(model: CatalogModel): CatalogModel {
  return {
    source: model.source,
    generatedAt: model.generatedAt,
    services: model.services.map((service) => ({ ...service })),
  };
}
