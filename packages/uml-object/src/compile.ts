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
import type { ObjectDocument, ObjectDomainModel, ObjectInstance, ObjectLink } from "./types";

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
  instances: readonly ObjectInstance[],
  diagnostics: Diagnostic[]
): void {
  const seen = new Map<string, string>();
  for (const inst of instances) {
    const existingId = seen.get(inst.name);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "object/no-duplicate-name",
          severity: "error",
          message: `Duplicate object name '${inst.name}'.`,
          target: `object:${inst.id}`,
          help: `Object names must be unique. First declaration: ${existingId}.`,
        })
      );
    } else {
      seen.set(inst.name, inst.id);
    }
  }
}

function validateLinkRefs(
  instances: readonly ObjectInstance[],
  links: readonly ObjectLink[],
  diagnostics: Diagnostic[]
): void {
  const knownNames = new Set(instances.map((inst) => inst.name));
  for (const link of links) {
    if (!knownNames.has(link.sourceName)) {
      diagnostics.push(
        createDiagnostic({
          code: "object/no-unknown-ref",
          severity: "error",
          message: `Unknown object '${link.sourceName}' in link.`,
          target: `link:${link.id}`,
          help: "Reference an object instance that exists in the diagram.",
        })
      );
    }
    if (!knownNames.has(link.targetName)) {
      diagnostics.push(
        createDiagnostic({
          code: "object/no-unknown-ref",
          severity: "error",
          message: `Unknown object '${link.targetName}' in link.`,
          target: `link:${link.id}`,
          help: "Reference an object instance that exists in the diagram.",
        })
      );
    }
  }
}

function compileInstanceNode(instance: ObjectInstance): DiagramNode {
  const nameText = instance.className ? `${instance.name}: ${instance.className}` : instance.name;

  const nameLine: NodeCompartmentLine = {
    text: nameText,
    role: "name",
    align: "middle",
    fontWeight: 700,
    // Underline convention for object instances is represented via metadata
  };

  const compartments: NodeCompartment[] = [{ id: `${instance.id}:name`, lines: [nameLine] }];

  if (instance.attributes.length > 0) {
    compartments.push({
      id: `${instance.id}:attributes`,
      lines: instance.attributes.map((attr) => ({
        text: `${attr.name}: ${attr.value}`,
        role: "member" as const,
      })),
    });
  }

  return {
    id: instance.id,
    kind: "object",
    label: nameText,
    compartments,
    metadata: {
      objectName: instance.name,
      className: instance.className,
      attributes: instance.attributes,
      underlined: true,
    },
  };
}

function compileLinkEdge(
  link: ObjectLink,
  nameMap: Map<string, ObjectInstance>
): DiagramEdge | null {
  const source = nameMap.get(link.sourceName);
  const target = nameMap.get(link.targetName);
  if (!source || !target) {
    return null;
  }

  return {
    id: link.id,
    kind: "link",
    sourceId: source.id,
    targetId: target.id,
    direction: "none",
    ...(link.label ? { label: link.label } : {}),
    metadata: {
      ...(link.sourceMultiplicity ? { sourceMultiplicity: link.sourceMultiplicity } : {}),
      ...(link.targetMultiplicity ? { targetMultiplicity: link.targetMultiplicity } : {}),
    },
  };
}

/**
 * Compile an object diagram domain model into a DiagramDocument IR.
 *
 * @param model - The object diagram domain model
 * @returns A compiled ObjectDocument ready for layout and rendering
 */
export function compileObjectDocument(model: ObjectDomainModel): ObjectDocument {
  const diagnostics: Diagnostic[] = [];
  const registry = new IdRegistry();
  const nameMap = new Map(model.instances.map((inst) => [inst.name, inst]));

  const nodes = model.instances.map(compileInstanceNode).sort(byId);
  const edges = model.links
    .map((link) => compileLinkEdge(link, nameMap))
    .filter((edge): edge is DiagramEdge => edge !== null)
    .sort(byId);

  register(registry, model.id, diagnostics);
  for (const node of nodes) {
    register(registry, node.id, diagnostics);
  }
  for (const edge of edges) {
    register(registry, edge.id, diagnostics);
  }

  validateDuplicateNames(model.instances, diagnostics);
  validateLinkRefs(model.instances, model.links, diagnostics);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "object",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics,
  };
}

/**
 * Compile object instances and links into a DiagramDocument IR.
 *
 * @param title - Diagram title
 * @param instances - Array of object instances
 * @param links - Array of object links (optional)
 * @returns A compiled ObjectDocument
 *
 * @example
 * ```ts
 * compile("Object Diagram", instances, links)
 * ```
 */
export function compile(
  title: string,
  instances: readonly ObjectInstance[],
  links: readonly ObjectLink[] = []
): ObjectDocument {
  return compileObjectDocument({
    id: createDeterministicId(["object-document", title], { prefix: "objdoc", length: 8 }),
    title,
    instances,
    links,
  });
}
