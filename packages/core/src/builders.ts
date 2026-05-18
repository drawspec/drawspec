import { createDeterministicId, IdRegistry } from "./id";
import type { DiagramEdge, DiagramNode, SourceRef, StyleRef } from "./types";

export type Direction = NonNullable<DiagramEdge["direction"]>;

export interface BuilderOptions {
  idRegistry?: IdRegistry;
}

export interface ElementBuilderOptions extends BuilderOptions {
  parentId?: string;
}

export interface RelationshipBuilderOptions extends BuilderOptions {
  source?: SourceRef;
}

export interface BuilderFactoryOptions extends BuilderOptions {}

type NodeFields = Omit<DiagramNode, "id" | "kind">;
type EdgeFields = Omit<DiagramEdge, "id" | "kind" | "sourceId" | "targetId">;

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function registerOrThrow(idRegistry: IdRegistry | undefined, id: string): void {
  const diagnostic = idRegistry?.registerId(id);

  if (diagnostic !== undefined && diagnostic !== null) {
    throw new Error(diagnostic.message);
  }
}

export class ElementBuilder<TNode extends DiagramNode = DiagramNode> {
  readonly kind: string;
  readonly idRegistry: IdRegistry | undefined;
  private explicitId: string | undefined;
  private fields: NodeFields;
  private tags = new Set<string>();
  private builtId: string | undefined;

  constructor(kind: string, options: ElementBuilderOptions = {}) {
    this.kind = kind;
    this.idRegistry = options.idRegistry;
    this.fields = {};

    if (options.parentId !== undefined) {
      this.fields.parentId = options.parentId;
    }
  }

  id(value?: string): this {
    this.explicitId = value;
    this.builtId = undefined;
    return this;
  }

  label(text: string): this {
    this.fields = { ...this.fields, label: text };
    this.builtId = undefined;
    return this;
  }

  description(text: string): this {
    this.fields = { ...this.fields, description: text };
    this.builtId = undefined;
    return this;
  }

  tag(...tags: string[]): this {
    for (const tag of tags) {
      this.tags.add(tag);
    }
    this.builtId = undefined;
    return this;
  }

  metadata(meta: Record<string, unknown>): this {
    this.fields = { ...this.fields, metadata: { ...this.fields.metadata, ...meta } };
    this.builtId = undefined;
    return this;
  }

  style(ref: StyleRef): this {
    this.fields = { ...this.fields, style: ref };
    this.builtId = undefined;
    return this;
  }

  source(ref: SourceRef): this {
    this.fields = { ...this.fields, source: ref };
    this.builtId = undefined;
    return this;
  }

  build(): TNode {
    const tags = sortedUnique([...this.tags]);
    const baseNode: DiagramNode = {
      kind: this.kind,
      ...this.fields,
      ...(tags.length === 0 ? {} : { tags }),
      id: this.resolveId(tags),
    };

    registerOrThrow(this.idRegistry, baseNode.id);
    return baseNode as TNode;
  }

  private resolveId(tags: readonly string[]): string {
    if (this.explicitId !== undefined) {
      return this.explicitId;
    }

    if (this.builtId !== undefined) {
      return this.builtId;
    }

    this.builtId = createDeterministicId(
      {
        kind: this.kind,
        fields: this.fields,
        tags,
      },
      { prefix: "node" },
    );
    return this.builtId;
  }
}

export class RelationshipBuilder<TEdge extends DiagramEdge = DiagramEdge> {
  readonly kind: string;
  readonly idRegistry: IdRegistry | undefined;
  private sourceId: string | undefined;
  private targetId: string | undefined;
  private fields: EdgeFields;
  private tags = new Set<string>();
  private builtId: string | undefined;

  constructor(kind = "relationship", options: RelationshipBuilderOptions = {}) {
    this.kind = kind;
    this.idRegistry = options.idRegistry;
    this.fields = {};

    if (options.source !== undefined) {
      this.fields.source = options.source;
    }
  }

  from(sourceId: string): this {
    this.sourceId = sourceId;
    this.builtId = undefined;
    return this;
  }

  to(targetId: string): this {
    this.targetId = targetId;
    this.builtId = undefined;
    return this;
  }

  label(text: string): this {
    this.fields = { ...this.fields, label: text };
    this.builtId = undefined;
    return this;
  }

  direction(direction: Direction): this {
    this.fields = { ...this.fields, direction };
    this.builtId = undefined;
    return this;
  }

  tag(...tags: string[]): this {
    for (const tag of tags) {
      this.tags.add(tag);
    }
    this.builtId = undefined;
    return this;
  }

  metadata(meta: Record<string, unknown>): this {
    this.fields = { ...this.fields, metadata: { ...this.fields.metadata, ...meta } };
    this.builtId = undefined;
    return this;
  }

  style(ref: StyleRef): this {
    this.fields = { ...this.fields, style: ref };
    this.builtId = undefined;
    return this;
  }

  build(): TEdge {
    if (this.sourceId === undefined) {
      throw new Error("Relationship source is required.");
    }

    if (this.targetId === undefined) {
      throw new Error("Relationship target is required.");
    }

    const tags = sortedUnique([...this.tags]);
    const baseEdge: DiagramEdge = {
      kind: this.kind,
      sourceId: this.sourceId,
      targetId: this.targetId,
      ...this.fields,
      ...(tags.length === 0 ? {} : { tags }),
      id: this.resolveId(tags),
    };

    registerOrThrow(this.idRegistry, baseEdge.id);
    return baseEdge as TEdge;
  }

  private resolveId(tags: readonly string[]): string {
    if (this.builtId !== undefined) {
      return this.builtId;
    }

    this.builtId = createDeterministicId(
      {
        kind: this.kind,
        sourceId: this.sourceId,
        targetId: this.targetId,
        fields: this.fields,
        tags,
      },
      { prefix: "edge" },
    );
    return this.builtId;
  }
}

export interface BuilderFactory {
  idRegistry: IdRegistry;
  element<TNode extends DiagramNode = DiagramNode>(kind: string, options?: Omit<ElementBuilderOptions, "idRegistry">): ElementBuilder<TNode>;
  relationship<TEdge extends DiagramEdge = DiagramEdge>(
    kind?: string,
    options?: Omit<RelationshipBuilderOptions, "idRegistry">,
  ): RelationshipBuilder<TEdge>;
}

export function createBuilder<TNode extends DiagramNode = DiagramNode>(
  kind: string,
  options: ElementBuilderOptions = {},
): ElementBuilder<TNode> {
  return new ElementBuilder<TNode>(kind, options);
}

export function createRelationshipBuilder<TEdge extends DiagramEdge = DiagramEdge>(
  kind = "relationship",
  options: RelationshipBuilderOptions = {},
): RelationshipBuilder<TEdge> {
  return new RelationshipBuilder<TEdge>(kind, options);
}

export function createBuilderFactory(options: BuilderFactoryOptions = {}): BuilderFactory {
  const idRegistry = options.idRegistry ?? new IdRegistry();

  return {
    idRegistry,
    element<TNode extends DiagramNode = DiagramNode>(kind: string, elementOptions: Omit<ElementBuilderOptions, "idRegistry"> = {}) {
      return createBuilder<TNode>(kind, { ...elementOptions, idRegistry });
    },
    relationship<TEdge extends DiagramEdge = DiagramEdge>(
      kind = "relationship",
      relationshipOptions: Omit<RelationshipBuilderOptions, "idRegistry"> = {},
    ) {
      return createRelationshipBuilder<TEdge>(kind, { ...relationshipOptions, idRegistry });
    },
  };
}
