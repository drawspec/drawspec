import type {
  ArchitectureElement,
  ArchitectureRelationship,
  ArchitectureRelationshipKind,
  C4ElementKind,
} from "@drawspec/architecture";

/** Serialized architecture element — avoids passing runtime objects across boundaries. */
export interface SerializedElement {
  readonly id: string;
  readonly kind: C4ElementKind;
  readonly name: string;
  readonly description?: string;
  readonly technology?: string;
  readonly owner?: string;
  readonly tags: readonly string[];
  readonly properties: Readonly<Record<string, unknown>>;
  readonly parentId?: string;
  readonly childIds: readonly string[];
}

/** Serialized architecture relationship. */
export interface SerializedRelationship {
  readonly id: string;
  readonly kind: ArchitectureRelationshipKind;
  readonly sourceId: string;
  readonly targetId: string;
  readonly label: string;
  readonly description?: string;
  readonly technology?: string;
  readonly protocol?: string;
  readonly direction: "forward" | "backward" | "bidirectional" | "none";
  readonly tags: readonly string[];
}

/** Architecture data payload for the viewer explorer. */
export interface ArchitectureData {
  readonly elements: readonly SerializedElement[];
  readonly relationships: readonly SerializedRelationship[];
}

export interface ExplorerConfig {
  readonly searchDebounceMs: number;
  readonly maxSearchResults: number;
  readonly perfOverlayEnabled: boolean;
}

export const DEFAULT_EXPLORER_CONFIG: ExplorerConfig = {
  searchDebounceMs: 150,
  maxSearchResults: 50,
  perfOverlayEnabled: false,
};

export interface RelationshipFilter {
  readonly kinds: ReadonlySet<ArchitectureRelationshipKind>;
  readonly sourceIds: ReadonlySet<string>;
  readonly targetIds: ReadonlySet<string>;
  readonly tags: ReadonlySet<string>;
}

export interface PerformanceMetrics {
  fps: number;
  elementCount: number;
  relationshipCount: number;
  layoutTimeMs: number;
  renderTimeMs: number;
  lastFrameTime: number;
}

export function serializeElement(el: ArchitectureElement): SerializedElement {
  return {
    id: el.id,
    kind: el.kind,
    name: el.name,
    ...(el.description !== undefined ? { description: el.description } : {}),
    ...(el.technology !== undefined ? { technology: el.technology } : {}),
    ...(typeof el.owner === "string" ? { owner: el.owner } : {}),
    tags: el.tags,
    properties: el.properties,
    ...(el.parent !== undefined ? { parentId: el.parent.id } : {}),
    childIds: el.children.map((c) => c.id),
  };
}

export function serializeRelationship(rel: ArchitectureRelationship): SerializedRelationship {
  return {
    id: rel.id,
    kind: rel.kind,
    sourceId: rel.source.id,
    targetId: rel.target.id,
    label: rel.label,
    ...(rel.description !== undefined ? { description: rel.description } : {}),
    ...(rel.technology !== undefined ? { technology: rel.technology } : {}),
    ...(rel.protocol !== undefined ? { protocol: rel.protocol } : {}),
    direction: rel.direction,
    tags: rel.tags,
  };
}
