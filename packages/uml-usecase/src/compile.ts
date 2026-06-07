import {
  createDeterministicId,
  createDiagnostic,
  type Diagnostic,
  type DiagramEdge,
  type DiagramNode,
  IdRegistry,
} from "@drawspec/core";
import type {
  Actor,
  SystemBoundary,
  UseCase,
  UseCaseDocument,
  UseCaseDomainModel,
  UseCaseRelationship,
} from "./types";

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function register(registry: IdRegistry, id: string, diagnostics: Diagnostic[]): void {
  const diagnostic = registry.registerId(id);
  if (diagnostic) {
    diagnostics.push(diagnostic);
  }
}

function validateDuplicateNames(
  items: readonly { name: string; id: string; kind: string }[],
  diagnostics: Diagnostic[]
): void {
  const seen = new Map<string, string>();
  for (const item of items) {
    const existingId = seen.get(item.name);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "usecase/no-duplicate-name",
          severity: "error",
          message: `Duplicate name '${item.name}' (${item.kind}).`,
          target: `${item.kind}:${item.id}`,
          help: `Element names must be unique. First declaration: ${existingId}.`,
        })
      );
    } else {
      seen.set(item.name, item.id);
    }
  }
}

function validateRelationshipRefs(
  actors: readonly Actor[],
  useCases: readonly UseCase[],
  relationships: readonly UseCaseRelationship[],
  diagnostics: Diagnostic[]
): void {
  const knownNames = new Set([...actors.map((a) => a.name), ...useCases.map((uc) => uc.name)]);
  for (const rel of relationships) {
    if (!knownNames.has(rel.sourceName)) {
      diagnostics.push(
        createDiagnostic({
          code: "usecase/no-unknown-ref",
          severity: "error",
          message: `Unknown element '${rel.sourceName}' in ${rel.kind} relationship.`,
          target: `relationship:${rel.id}`,
          help: "Reference an actor or use case that exists in the diagram.",
        })
      );
    }
    if (!knownNames.has(rel.targetName)) {
      diagnostics.push(
        createDiagnostic({
          code: "usecase/no-unknown-ref",
          severity: "error",
          message: `Unknown element '${rel.targetName}' in ${rel.kind} relationship.`,
          target: `relationship:${rel.id}`,
          help: "Reference an actor or use case that exists in the diagram.",
        })
      );
    }
  }
}

function validateBoundaryRefs(
  useCases: readonly UseCase[],
  boundaries: readonly SystemBoundary[],
  diagnostics: Diagnostic[]
): void {
  const knownNames = new Set(useCases.map((uc) => uc.name));
  for (const boundary of boundaries) {
    for (const name of boundary.useCaseNames) {
      if (!knownNames.has(name)) {
        diagnostics.push(
          createDiagnostic({
            code: "usecase/no-unknown-ref",
            severity: "error",
            message: `Unknown use case '${name}' in system boundary '${boundary.name}'.`,
            target: `system-boundary:${boundary.id}`,
            help: "Reference a use case that exists in the diagram.",
          })
        );
      }
    }
  }
}

function compileActorNode(actor: Actor): DiagramNode {
  return {
    id: actor.id,
    kind: "actor",
    label: actor.name,
    ...(actor.stereotype
      ? {
          compartments: [
            {
              id: `${actor.id}:name`,
              lines: [
                {
                  text: `<<${actor.stereotype}>>`,
                  role: "stereotype",
                  align: "middle",
                  fontStyle: "italic",
                },
                { text: actor.name, role: "name", align: "middle", fontWeight: 700 },
              ],
            },
          ],
        }
      : {}),
  };
}

function compileUseCaseNode(useCase: UseCase): DiagramNode {
  return {
    id: useCase.id,
    kind: "use-case",
    label: useCase.name,
    shape: { type: "ellipse" },
    ...(useCase.description ? { description: useCase.description } : {}),
  };
}

function compileBoundaryGroup(boundary: SystemBoundary): DiagramNode {
  return {
    id: boundary.id,
    kind: "system-boundary",
    label: boundary.name,
    shape: { type: "rect" },
  };
}

function compileRelationshipEdge(
  relationship: UseCaseRelationship,
  nameMap: Map<string, { id: string }>
): DiagramEdge | null {
  const source = nameMap.get(relationship.sourceName);
  const target = nameMap.get(relationship.targetName);
  if (!source || !target) {
    return null;
  }

  const isDashed = relationship.kind === "include" || relationship.kind === "extend";

  return {
    id: relationship.id,
    kind: relationship.kind,
    sourceId: source.id,
    targetId: target.id,
    direction: relationship.kind === "generalize" ? "backward" : "forward",
    ...(isDashed ? { metadata: { dashed: true } } : {}),
    ...(relationship.kind === "include"
      ? { label: "<<include>>" }
      : relationship.kind === "extend"
        ? { label: "<<extend>>" }
        : {}),
  };
}

/**
 * Compile a use case domain model into a DiagramDocument IR.
 *
 * @param model - The use case domain model
 * @returns A compiled UseCaseDocument ready for layout and rendering
 */
export function compileUseCaseDocument(model: UseCaseDomainModel): UseCaseDocument {
  const diagnostics: Diagnostic[] = [];
  const registry = new IdRegistry();

  const nameMap = new Map<string, { id: string }>();
  for (const actor of model.actors) {
    nameMap.set(actor.name, actor);
  }
  for (const uc of model.useCases) {
    nameMap.set(uc.name, uc);
  }

  const actorNodes = model.actors.map(compileActorNode);
  const useCaseNodes = model.useCases.map(compileUseCaseNode);
  const boundaryNodes = model.systemBoundaries.map(compileBoundaryGroup);
  const nodes = [...actorNodes, ...useCaseNodes, ...boundaryNodes].sort(byId);

  const edges = model.relationships
    .map((rel) => compileRelationshipEdge(rel, nameMap))
    .filter((edge): edge is DiagramEdge => edge !== null)
    .sort(byId);

  register(registry, model.id, diagnostics);
  for (const node of nodes) {
    register(registry, node.id, diagnostics);
  }
  for (const edge of edges) {
    register(registry, edge.id, diagnostics);
  }

  validateDuplicateNames(
    [
      ...model.actors.map((a) => ({ name: a.name, id: a.id, kind: "actor" })),
      ...model.useCases.map((uc) => ({ name: uc.name, id: uc.id, kind: "use-case" })),
    ],
    diagnostics
  );
  validateRelationshipRefs(model.actors, model.useCases, model.relationships, diagnostics);
  validateBoundaryRefs(model.useCases, model.systemBoundaries, diagnostics);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "use-case",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics,
  };
}

/**
 * Compile use case diagram elements into a DiagramDocument IR.
 *
 * @param title - Diagram title
 * @param actors - Array of actors
 * @param useCases - Array of use cases
 * @param relationships - Array of relationships (optional)
 * @param boundaries - Array of system boundaries (optional)
 * @returns A compiled UseCaseDocument
 *
 * @example
 * ```ts
 * compile("Login", actors, useCases, relationships)
 * ```
 */
export function compile(
  title: string,
  actors: readonly Actor[],
  useCases: readonly UseCase[],
  relationships: readonly UseCaseRelationship[] = [],
  boundaries: readonly SystemBoundary[] = []
): UseCaseDocument {
  return compileUseCaseDocument({
    id: createDeterministicId(["usecase-document", title], { prefix: "ucdoc", length: 8 }),
    title,
    actors,
    useCases,
    systemBoundaries: boundaries,
    relationships,
  });
}
