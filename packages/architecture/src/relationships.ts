import type {
  ArchitectureElement,
  ArchitectureRelationship,
  ArchitectureRelationshipKind,
  ArchitectureRelationshipOptions,
} from "./types";

function sortedUnique(values: readonly string[] = []): string[] {
  return [...new Set(values)].sort();
}

export class ArchitectureRelationshipImpl implements ArchitectureRelationship {
  readonly id: string;
  readonly kind: ArchitectureRelationshipKind = "uses";
  readonly source: ArchitectureElement;
  readonly target: ArchitectureElement;
  readonly label: string;
  readonly description: string | undefined;
  readonly technology: string | undefined;
  readonly protocol: string | undefined;
  readonly direction: ArchitectureRelationship["direction"];
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;

  constructor(
    id: string,
    source: ArchitectureElement,
    target: ArchitectureElement,
    label: string,
    options: ArchitectureRelationshipOptions = {}
  ) {
    this.id = id;
    this.source = source;
    this.target = target;
    this.label = label;
    this.description = options.description;
    this.technology = options.technology;
    this.protocol = options.protocol;
    this.direction = options.direction ?? "forward";
    this.tags = Object.freeze(sortedUnique(["relationship", ...(options.tags ?? [])]));
    this.metadata = Object.freeze({
      ...options.metadata,
      ...(options.technology === undefined ? {} : { technology: options.technology }),
      ...(options.protocol === undefined ? {} : { protocol: options.protocol }),
      ...(options.criticality === undefined ? {} : { criticality: options.criticality }),
      ...(options.owner === undefined ? {} : { owner: options.owner }),
    });
  }
}
