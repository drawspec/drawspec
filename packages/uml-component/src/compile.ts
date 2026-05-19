import type { Diagnostic, DiagramEdge, DiagramNode } from "@drawspec/core";
import type {
  ComponentDiagramDocument,
  ComponentDiagramDomainModel,
  ComponentDiagramElement,
  ComponentElement,
  DependencyEdge,
  InterfaceElement,
} from "./types";

function isComponent(element: ComponentDiagramElement): element is ComponentElement {
  return element.kind === "component";
}

function isInterface(element: ComponentDiagramElement): element is InterfaceElement {
  return element.kind === "interface";
}

function isEdge(element: ComponentDiagramElement): element is DependencyEdge {
  return (
    element.kind === "dependency" || element.kind === "provides" || element.kind === "requires"
  );
}

function diagnostic(code: string, message: string): Diagnostic {
  return { severity: "error", code, message };
}

export function compileComponentDiagramDocument(
  model: ComponentDiagramDomainModel
): ComponentDiagramDocument {
  const components = model.elements.filter(isComponent);
  const interfaces = model.elements.filter(isInterface);
  const explicitEdges = model.elements.filter(isEdge);
  const nodes: DiagramNode[] = [...components, ...interfaces].map((element) => ({
    id: element.id,
    kind: element.kind,
    label: element.name,
    metadata:
      element.kind === "component"
        ? {
            provides: element.providedInterfaces.map((ref) => ref.name),
            requires: element.requiredInterfaces.map((ref) => ref.name),
          }
        : { notation: "lollipop" },
  }));

  const componentIdsByName = new Map(components.map((component) => [component.name, component.id]));
  const interfaceIdsByName = new Map(
    interfaces.map((interfaceElement) => [interfaceElement.name, interfaceElement.id])
  );
  const edges: DiagramEdge[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const edge of explicitEdges) {
    const compiled = compileExplicitEdge(edge, componentIdsByName, interfaceIdsByName);
    if (compiled === undefined) {
      diagnostics.push(
        diagnostic(
          "no-unknown-component-ref",
          `${edge.kind} ${edge.sourceName} -> ${edge.targetName} references an unknown component or interface`
        )
      );
      continue;
    }
    if (compiled.sourceId === compiled.targetId) {
      diagnostics.push(
        diagnostic("no-self-dependency", `Component ${edge.sourceName} cannot depend on itself`)
      );
      continue;
    }
    edges.push(compiled);
  }

  for (const component of components) {
    const seenProvided = new Set<string>();
    for (const provided of component.providedInterfaces) {
      if (seenProvided.has(provided.name)) continue;
      seenProvided.add(provided.name);
      const targetId = interfaceIdsByName.get(provided.name);
      if (targetId !== undefined) {
        edges.push({
          id: `${component.id}_provides_${targetId}`,
          kind: "provides",
          sourceId: component.id,
          targetId,
          direction: "forward",
        });
      } else {
        diagnostics.push(
          diagnostic(
            "component/no-unknown-component-ref",
            `Component "${component.name}" provides unknown interface "${provided.name}"`
          )
        );
      }
    }
    const seenRequired = new Set<string>();
    for (const required of component.requiredInterfaces) {
      if (seenRequired.has(required.name)) continue;
      seenRequired.add(required.name);
      const targetId = interfaceIdsByName.get(required.name);
      if (targetId !== undefined) {
        edges.push({
          id: `${component.id}_requires_${targetId}`,
          kind: "requires",
          sourceId: component.id,
          targetId,
          direction: "forward",
        });
      } else {
        diagnostics.push(
          diagnostic(
            "component/no-unknown-component-ref",
            `Component "${component.name}" requires unknown interface "${required.name}"`
          )
        );
      }
    }
  }

  const document: ComponentDiagramDocument = {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "component",
    nodes,
    edges,
    groups: [],
    annotations: [],
  };
  if (diagnostics.length > 0) {
    document.diagnostics = diagnostics;
  }
  return document;
}

function compileExplicitEdge(
  edge: DependencyEdge,
  componentIdsByName: ReadonlyMap<string, string>,
  interfaceIdsByName: ReadonlyMap<string, string>
): DiagramEdge | undefined {
  const sourceId = componentIdsByName.get(edge.sourceName);
  const targetId =
    edge.kind === "dependency"
      ? componentIdsByName.get(edge.targetName)
      : interfaceIdsByName.get(edge.targetName);
  if (sourceId === undefined || targetId === undefined) {
    return undefined;
  }
  const compiled: DiagramEdge = {
    id: edge.id,
    kind: edge.kind,
    sourceId,
    targetId,
    direction: "forward",
  };
  if (edge.label !== undefined) {
    compiled.label = edge.label;
  }
  return compiled;
}
