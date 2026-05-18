import type {
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  LayoutSpec,
  StyleRef,
} from "@drawspec/core";
import type {
  ArchitectureElement,
  ArchitectureModel,
  ArchitectureRelationship,
  ArchitectureView,
  ArchitectureViewKind,
  AutoLayoutDirection,
  Workspace,
} from "./types";

interface CollectedModel {
  elements: ArchitectureElement[];
  relationships: ArchitectureRelationship[];
}

function collectModel(model: ArchitectureModel): CollectedModel {
  const elements = [...model.elements];
  const relationships = [...model.relationships];
  const maybeImported = model as ArchitectureModel & {
    readonly importedModels?: readonly ArchitectureModel[];
  };
  for (const imported of maybeImported.importedModels ?? []) {
    const nested = collectModel(imported);
    elements.push(...nested.elements);
    relationships.push(...nested.relationships);
  }
  return { elements, relationships };
}

function flattenElements(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  const flattened: ArchitectureElement[] = [];
  const visit = (element: ArchitectureElement): void => {
    flattened.push(element);
    for (const child of [...element.children].sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      visit(child);
    }
  };
  for (const element of [...elements].sort((left, right) => left.id.localeCompare(right.id))) {
    visit(element);
  }
  return flattened;
}
function layoutDirection(direction: AutoLayoutDirection | undefined): LayoutSpec | undefined {
  if (direction === undefined) {
    return undefined;
  }
  const directions: Record<AutoLayoutDirection, NonNullable<LayoutSpec["direction"]>> = {
    "bottom-up": "bt",
    "left-right": "lr",
    "right-left": "rl",
    "top-down": "tb",
  };
  return { engine: "auto", direction: directions[direction] };
}

function styleRef(
  prefix: "element" | "relationship",
  tags: readonly string[],
  stylesheet: Stylesheet | undefined
): StyleRef | undefined {
  const sortedTags = [...tags].sort();
  const tag = sortedTags[0];
  if (tag === undefined) {
    return undefined;
  }
  const styleId = `${prefix}:${tag}`;
  // Only emit style ref when stylesheet has a matching rule
  if (stylesheet?.rules?.[styleId] === undefined) {
    return undefined;
  }
  return { id: styleId };
}
function visibleElementIds(
  view: ArchitectureView,
  allElements: readonly ArchitectureElement[]
): Set<string> {
  const ids = new Set<string>();
  ids.add(view.subject.id);

  if (view.kind === "container") {
    for (const child of view.subject.children) {
      ids.add(child.id);
    }
  }

  if (view.includeAll) {
    for (const element of allElements) {
      ids.add(element.id);
    }
  }

  for (const element of view.includedElements) {
    ids.add(element.id);
  }
  return ids;
}
function toNode(element: ArchitectureElement, stylesheet: Stylesheet | undefined): DiagramNode {
  const style = styleRef("element", element.tags, stylesheet);
  return {
    id: element.id,
    kind: element.kind,
    label: element.name,
    ...(element.description === undefined ? {} : { description: element.description }),
    ...(element.parent === undefined ? {} : { parentId: element.parent.id }),
    tags: [...element.tags].sort(),
    metadata: {
      ...(element.technology === undefined ? {} : { technology: element.technology }),
      ...(element.owner === undefined ? {} : { owner: element.owner }),
      ...element.metadata,
      ...(Object.keys(element.properties).length === 0 ? {} : { properties: element.properties }),
    },
    ...(style === undefined ? {} : { style }),
  };
}
function toEdge(
  relationship: ArchitectureRelationship,
  stylesheet: Stylesheet | undefined
): DiagramEdge {
  const style = styleRef("relationship", relationship.tags, stylesheet);
  return {
    id: relationship.id,
    kind: relationship.kind,
    sourceId: relationship.source.id,
    targetId: relationship.target.id,
    label: relationship.label,
    direction: relationship.direction,
    tags: [...relationship.tags].sort(),
    metadata: relationship.metadata,
    ...(style === undefined ? {} : { style }),
  };
}

function toGroups(
  elements: readonly ArchitectureElement[],
  visibleIds: ReadonlySet<string>
): DiagramGroup[] {
  const groups: DiagramGroup[] = [];
  for (const element of elements) {
    const childIds = element.children
      .map((child) => child.id)
      .filter((id) => visibleIds.has(id))
      .sort();
    if (element.kind === "softwareSystem" && childIds.length > 0) {
      const style = styleRef("element", element.tags, undefined);
      groups.push({
        id: `group_${element.id}`,
        kind: "softwareSystem",
        label: element.name,
        ...(element.description === undefined ? {} : { description: element.description }),
        childIds,
        tags: [...element.tags].sort(),
        metadata: {
          ...(element.technology === undefined ? {} : { technology: element.technology }),
          ...element.metadata,
        },
        ...(style === undefined ? {} : { style }),
      });
    }
  }
  return groups.sort((left, right) => left.id.localeCompare(right.id));
}
function compileView(
  workspace: Workspace,
  view: ArchitectureView,
  viewKind: ArchitectureViewKind
): DiagramDocument {
  const collected = collectModel(workspace.model);
  const allElements = flattenElements(collected.elements);
  const visibleIds = visibleElementIds(view, allElements);
  const visibleElements = allElements.filter((element) => visibleIds.has(element.id));
  const visibleRelationships = collected.relationships.filter(
    (relationship) =>
      visibleIds.has(relationship.source.id) && visibleIds.has(relationship.target.id)
  );

  const layout = layoutDirection(view.layoutDirection);
  return {
    schemaVersion: "1.0",
    id: view.id,
    title: view.title,
    kind: "architecture",
    nodes: visibleElements
      .map((element) => toNode(element, workspace.styles.stylesheet))
      .sort((left, right) => left.id.localeCompare(right.id)),
    edges: visibleRelationships
      .map((relationship) => toEdge(relationship, workspace.styles.stylesheet))
      .sort((left, right) => left.id.localeCompare(right.id)),
    groups: toGroups(visibleElements, visibleIds),
    annotations: [],
    ...(layout === undefined ? {} : { layout }),
    styles: workspace.styles.stylesheet,
    metadata: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      viewKind,
      subjectId: view.subject.id,
    },
  };
}

export function compileWorkspace(workspace: Workspace): DiagramDocument[] {
  return [...workspace.views.items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((view) => compileView(workspace, view, view.kind));
}
