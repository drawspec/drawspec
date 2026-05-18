import {
  createDeterministicId,
  createDiagnostic,
  type Diagnostic,
  type DiagramEdge,
  type DiagramNode,
  IdRegistry,
} from "@drawspec/core";
import type {
  ClassDiagramDocument,
  ClassDiagramElement,
  ClassDomainModel,
  ClassElement,
  ClassMethod,
  ClassRelationship,
  EnumElement,
  InterfaceElement,
} from "./types";

const PRIMITIVE_TYPES = new Set(["boolean", "number", "string", "void", "unknown", "null"]);

function target(kind: string, id: string): string {
  return `${kind}:${id}`;
}

function typeNamesFromMethod(method: ClassMethod): string[] {
  const names = method.parameters.map((parameter) => parameter.type);
  if (method.returnType) {
    names.push(method.returnType);
  }
  return names;
}

function relationshipId(kind: string, sourceName: string, targetName: string): string {
  return createDeterministicId(["class-relationship", kind, sourceName, targetName], {
    prefix: "rel",
    length: 8,
  });
}

function register(registry: IdRegistry, id: string, diagnostics: Diagnostic[]): void {
  const diagnostic = registry.registerId(id);
  if (diagnostic) {
    diagnostics.push(diagnostic);
  }
}

function validateDuplicateMembers(element: ClassElement, diagnostics: Diagnostic[]): void {
  const seen = new Map<string, string>();
  for (const member of [...element.fields, ...element.methods]) {
    const existingId = seen.get(member.name);
    if (existingId) {
      diagnostics.push(
        createDiagnostic({
          code: "class/no-duplicate-member",
          severity: "error",
          message: `Duplicate member '${member.name}' in class '${element.name}'.`,
          target: target("member", member.id),
          help: `Member names must be unique within a class. First declaration: ${existingId}.`,
        })
      );
    } else {
      seen.set(member.name, member.id);
    }
  }
}

function validateVisibility(
  element: ClassElement | InterfaceElement,
  diagnostics: Diagnostic[]
): void {
  for (const method of element.methods) {
    if (!method.visibility) {
      diagnostics.push(
        createDiagnostic({
          code: "class/require-visibility",
          severity: "error",
          message: `Method '${method.name}' on '${element.name}' must declare visibility.`,
          target: target("method", method.id),
          help: "Pass { visibility: 'public' | 'protected' | 'private' | 'package' } to method().",
        })
      );
    }
  }
}

function validateCircularInheritance(
  classes: readonly ClassElement[],
  diagnostics: Diagnostic[]
): void {
  const byName = new Map(classes.map((element) => [element.name, element]));

  for (const element of classes) {
    const path: string[] = [];
    const visited = new Set<string>();
    let current: ClassElement | undefined = element;

    while (current?.extendsName) {
      if (visited.has(current.name)) {
        path.push(current.name);
        diagnostics.push(
          createDiagnostic({
            code: "class/no-circular-inheritance",
            severity: "error",
            message: `Circular inheritance detected: ${path.join(" -> ")}.`,
            target: target("class", element.id),
            help: "Class inheritance must form an acyclic graph.",
          })
        );
        break;
      }

      visited.add(current.name);
      path.push(current.name);
      current = byName.get(current.extendsName);
    }
  }
}

function validateUnknownTypes(
  elements: readonly ClassDiagramElement[],
  diagnostics: Diagnostic[]
): void {
  const knownTypes = new Set(elements.map((element) => element.name));
  const validate = (name: string, owner: ClassDiagramElement) => {
    if (!PRIMITIVE_TYPES.has(name) && !knownTypes.has(name)) {
      diagnostics.push(
        createDiagnostic({
          code: "class/no-unknown-type-ref",
          severity: "error",
          message: `Unknown type reference '${name}' on '${owner.name}'.`,
          target: target(owner.kind, owner.id),
          help: "Reference another class, interface, enum, or a primitive type.",
        })
      );
    }
  };

  for (const element of elements) {
    if (element.kind === "class") {
      for (const field of element.fields) {
        validate(field.type, element);
      }
      for (const name of element.methods.flatMap(typeNamesFromMethod)) {
        validate(name, element);
      }
      for (const name of element.interfaceNames) {
        validate(name, element);
      }
      for (const name of element.usedTypeNames) {
        validate(name, element);
      }
      if (element.extendsName) {
        validate(element.extendsName, element);
      }
    } else if (element.kind === "interface") {
      for (const name of element.methods.flatMap(typeNamesFromMethod)) {
        validate(name, element);
      }
      for (const name of element.interfaceNames) {
        validate(name, element);
      }
    }
  }
}

function compileNode(element: ClassDiagramElement): DiagramNode {
  const metadata =
    element.kind === "class"
      ? {
          fields: element.fields,
          methods: element.methods,
          abstract: element.abstract,
        }
      : element.kind === "interface"
        ? { methods: element.methods, stereotype: "interface" }
        : { values: (element as EnumElement).values, stereotype: "enum" };

  return {
    id: element.id,
    kind: element.kind,
    label: element.name,
    metadata,
  };
}

function compileEdges(
  elements: readonly ClassDiagramElement[],
  explicitRelationships: readonly ClassRelationship[]
): DiagramEdge[] {
  const byName = new Map(elements.map((element) => [element.name, element]));
  const edges: DiagramEdge[] = [];
  const pushEdge = (kind: string, sourceName: string, targetName: string) => {
    const source = byName.get(sourceName);
    const relationshipTarget = byName.get(targetName);
    if (!source || !relationshipTarget) {
      return;
    }
    edges.push({
      id: relationshipId(kind, sourceName, targetName),
      kind,
      sourceId: source.id,
      targetId: relationshipTarget.id,
      direction: "forward",
    });
  };

  for (const element of elements) {
    if (element.kind === "class") {
      if (element.extendsName) {
        pushEdge("extends", element.name, element.extendsName);
      }
      for (const name of element.interfaceNames) {
        pushEdge("implements", element.name, name);
      }
      for (const name of element.usedTypeNames) {
        pushEdge("uses", element.name, name);
      }
    } else if (element.kind === "interface") {
      for (const name of element.interfaceNames) {
        pushEdge("implements", element.name, name);
      }
    }
  }

  for (const relationship of explicitRelationships) {
    pushEdge(relationship.kind, relationship.sourceName, relationship.targetName);
  }

  return edges.sort((left, right) => left.id.localeCompare(right.id));
}

export function compileClassDocument(model: ClassDomainModel): ClassDiagramDocument {
  const diagnostics: Diagnostic[] = [];
  const registry = new IdRegistry();
  const classes = model.elements.filter(
    (element): element is ClassElement => element.kind === "class"
  );
  const nodes = model.elements
    .map(compileNode)
    .sort((left, right) => left.id.localeCompare(right.id));
  const edges = compileEdges(model.elements, model.relationships);

  register(registry, model.id, diagnostics);
  for (const node of nodes) {
    register(registry, node.id, diagnostics);
  }
  for (const edge of edges) {
    register(registry, edge.id, diagnostics);
  }

  for (const element of classes) {
    validateDuplicateMembers(element, diagnostics);
  }
  for (const element of model.elements.filter(
    (element): element is ClassElement | InterfaceElement => element.kind !== "enum"
  )) {
    validateVisibility(element, diagnostics);
  }
  validateCircularInheritance(classes, diagnostics);
  validateUnknownTypes(model.elements, diagnostics);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "class",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics,
  };
}

export function compile(
  title: string,
  elements: readonly ClassDiagramElement[],
  relationships: readonly ClassRelationship[] = []
): ClassDiagramDocument {
  return compileClassDocument({
    id: createDeterministicId(["class-document", title], { prefix: "classdoc", length: 8 }),
    title,
    elements,
    relationships,
  });
}
