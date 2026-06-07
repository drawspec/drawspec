import {
  createDeterministicId,
  createDiagnostic,
  type Diagnostic,
  type DiagramEdge,
  type DiagramNode,
  IdRegistry,
  type NodeCompartment,
  type NodeCompartmentLine,
} from "@drawspec/core";
import type { ErDocument, ErDomainModel, ErEntity, ErRelationship } from "./types";

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function register(registry: IdRegistry, id: string, diagnostics: Diagnostic[]): void {
  const diagnostic = registry.registerId(id);
  if (diagnostic) {
    diagnostics.push(diagnostic);
  }
}

function validateDuplicateEntities(entities: readonly ErEntity[], diagnostics: Diagnostic[]): void {
  const seen = new Map<string, string>();
  for (const entity of entities) {
    const existingId = seen.get(entity.name);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "er/no-duplicate-entity",
          severity: "error",
          message: `Duplicate entity '${entity.name}'.`,
          target: `entity:${entity.id}`,
          help: `Entity names must be unique. First declaration: ${existingId}.`,
        })
      );
    } else {
      seen.set(entity.name, entity.id);
    }
  }
}

function validateDuplicateAttributes(entity: ErEntity, diagnostics: Diagnostic[]): void {
  const seen = new Map<string, string>();
  for (const attr of entity.attributes) {
    const existingId = seen.get(attr.name);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "er/no-duplicate-attribute",
          severity: "error",
          message: `Duplicate attribute '${attr.name}' in entity '${entity.name}'.`,
          target: `attribute:${attr.id}`,
          help: `Attribute names must be unique within an entity. First declaration: ${existingId}.`,
        })
      );
    } else {
      seen.set(attr.name, attr.id);
    }
  }
}

function validateRelationshipRefs(
  entities: readonly ErEntity[],
  relationships: readonly ErRelationship[],
  diagnostics: Diagnostic[]
): void {
  const knownNames = new Set(entities.map((entity) => entity.name));
  for (const rel of relationships) {
    if (!knownNames.has(rel.sourceName)) {
      diagnostics.push(
        createDiagnostic({
          code: "er/no-unknown-entity-ref",
          severity: "error",
          message: `Unknown entity '${rel.sourceName}' in relationship.`,
          target: `relationship:${rel.id}`,
          help: "Reference an entity that exists in the diagram.",
        })
      );
    }
    if (!knownNames.has(rel.targetName)) {
      diagnostics.push(
        createDiagnostic({
          code: "er/no-unknown-entity-ref",
          severity: "error",
          message: `Unknown entity '${rel.targetName}' in relationship.`,
          target: `relationship:${rel.id}`,
          help: "Reference an entity that exists in the diagram.",
        })
      );
    }
  }
}

function attributeLine(attr: {
  name: string;
  type: string;
  constraint?: string;
}): NodeCompartmentLine {
  const constraintLabel = attr.constraint ? ` [${attr.constraint.toUpperCase()}]` : "";
  return {
    text: `+ ${attr.name}: ${attr.type}${constraintLabel}`,
    role: "member",
  };
}

function compileEntityNode(entity: ErEntity): DiagramNode {
  const compartments: NodeCompartment[] = [];
  if (entity.attributes.length > 0) {
    compartments.push({
      id: `${entity.id}:attributes`,
      header: "Attributes",
      lines: entity.attributes.map(attributeLine),
    });
  }
  return {
    id: entity.id,
    kind: "entity",
    label: entity.name,
    compartments,
  };
}

function compileRelationshipEdge(
  relationship: ErRelationship,
  entityByName: Map<string, ErEntity>
): DiagramEdge | null {
  const source = entityByName.get(relationship.sourceName);
  const target = entityByName.get(relationship.targetName);
  if (!source || !target) {
    return null;
  }

  const edge: DiagramEdge = {
    id: relationship.id,
    kind: "relationship",
    sourceId: source.id,
    targetId: target.id,
    direction: "none",
    metadata: {
      sourceCardinality: relationship.sourceCardinality,
      targetCardinality: relationship.targetCardinality,
    },
  };

  if (relationship.name) {
    edge.label = relationship.name;
  }

  return edge;
}

/**
 * Compile an ER domain model into a DiagramDocument IR.
 *
 * @param model - The ER domain model containing entities and relationships
 * @returns A compiled ErDocument ready for layout and rendering
 */
export function compileErDocument(model: ErDomainModel): ErDocument {
  const diagnostics: Diagnostic[] = [];
  const registry = new IdRegistry();
  const entityByName = new Map(model.entities.map((entity) => [entity.name, entity]));

  const nodes = model.entities.map(compileEntityNode).sort(byId);
  const edges = model.relationships
    .map((rel) => compileRelationshipEdge(rel, entityByName))
    .filter((edge): edge is DiagramEdge => edge !== null)
    .sort(byId);

  register(registry, model.id, diagnostics);
  for (const node of nodes) {
    register(registry, node.id, diagnostics);
  }
  for (const edge of edges) {
    register(registry, edge.id, diagnostics);
  }

  validateDuplicateEntities(model.entities, diagnostics);
  for (const entity of model.entities) {
    validateDuplicateAttributes(entity, diagnostics);
  }
  validateRelationshipRefs(model.entities, model.relationships, diagnostics);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "er",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics,
  };
}

/**
 * Compile ER entities and relationships into a DiagramDocument IR.
 *
 * @param title - Diagram title
 * @param entities - Array of ER entities
 * @param relationships - Array of ER relationships (optional)
 * @returns A compiled ErDocument
 *
 * @example
 * ```ts
 * compile("User-Orders", [user, order], [userOrderRel])
 * ```
 */
export function compile(
  title: string,
  entities: readonly ErEntity[],
  relationships: readonly ErRelationship[] = []
): ErDocument {
  return compileErDocument({
    id: createDeterministicId(["er-document", title], { prefix: "erdoc", length: 8 }),
    title,
    entities: [...entities],
    relationships: [...relationships],
  });
}
