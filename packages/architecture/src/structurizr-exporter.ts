import type {
  ArchitectureElement,
  ArchitectureRelationship,
  ArchitectureView,
  AutoLayoutDirection,
  C4ElementKind,
  Workspace,
} from "./types";

export interface StructurizrElement {
  id: string;
  name: string;
  type: StructurizrElementType;
  description?: string;
  technology?: string;
  tags?: string;
  properties?: Record<string, unknown>;
  parentId?: string;
  relationships?: StructurizrRelationship[];
}

export interface StructurizrRelationship {
  id: string;
  sourceId: string;
  destinationId: string;
  description: string;
  technology?: string;
  tags?: string;
  properties?: Record<string, unknown>;
}

export type StructurizrElementType = "Person" | "SoftwareSystem" | "Container" | "Component";

export interface StructurizrPerson extends StructurizrElement {
  type: "Person";
  location?: "Internal" | "External" | "Unspecified";
}

export interface StructurizrSoftwareSystem extends StructurizrElement {
  type: "SoftwareSystem";
  location?: "Internal" | "External" | "Unspecified";
  containers?: StructurizrContainer[];
}

export interface StructurizrContainer extends StructurizrElement {
  type: "Container";
}

export interface StructurizrSystemContextView {
  key: string;
  softwareSystemId: string;
  description?: string;
  autoLayout?: { rankDirection: string; rankSeparation: number; nodeSeparation: number };
}

export interface StructurizrContainerView {
  key: string;
  softwareSystemId: string;
  description?: string;
  autoLayout?: { rankDirection: string; rankSeparation: number; nodeSeparation: number };
}

export interface StructurizrViews {
  systemContextViews?: StructurizrSystemContextView[];
  containerViews?: StructurizrContainerView[];
}

export interface StructurizrWorkspace {
  id: number;
  name: string;
  description?: string;
  version?: string;
  model: {
    people?: StructurizrPerson[];
    softwareSystems?: StructurizrSoftwareSystem[];
  };
  views: StructurizrViews;
}

const ELEMENT_TYPE_MAP: Record<C4ElementKind, StructurizrElementType> = {
  person: "Person",
  softwareSystem: "SoftwareSystem",
  container: "Container",
  database: "Container",
};

const AUTO_LAYOUT_MAP: Record<AutoLayoutDirection, string> = {
  "left-right": "LeftRight",
  "right-left": "RightLeft",
  "top-down": "TopBottom",
  "bottom-up": "BottomTop",
};

function elementTags(element: ArchitectureElement): string | undefined {
  const filtered = [...element.tags].sort().filter((t) => t !== element.kind);
  return filtered.length > 0 ? filtered.join(",") : undefined;
}

function relationshipTags(relationship: ArchitectureRelationship): string | undefined {
  const filtered = [...relationship.tags]
    .sort()
    .filter((t) => t !== "relationship" && t !== "uses");
  return filtered.length > 0 ? filtered.join(",") : undefined;
}

function collectAllElements(element: ArchitectureElement): ArchitectureElement[] {
  const result: ArchitectureElement[] = [element];
  for (const child of element.children) {
    result.push(...collectAllElements(child));
  }
  return result;
}

function flattenElements(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  const result: ArchitectureElement[] = [];
  for (const element of elements) {
    result.push(...collectAllElements(element));
  }
  return result;
}

function toStructurizrElement(element: ArchitectureElement): StructurizrElement {
  const type = ELEMENT_TYPE_MAP[element.kind];
  const tags = elementTags(element);
  const base: StructurizrElement = {
    id: element.id,
    name: element.name,
    type,
    ...(tags !== undefined ? { tags } : {}),
  };

  if (element.description !== undefined) {
    base.description = element.description;
  }

  if (element.kind === "database") {
    base.technology = element.technology ?? "Database";
    base.tags = base.tags ? `${base.tags},Database,Element` : "Database,Element";
  } else if (element.technology !== undefined) {
    base.technology = element.technology;
  }

  if (element.parent !== undefined) {
    base.parentId = element.parent.id;
  }

  const props: Record<string, unknown> = {};
  if (element.properties && Object.keys(element.properties).length > 0) {
    Object.assign(props, element.properties);
  }
  if (element.metadata && Object.keys(element.metadata).length > 0) {
    Object.assign(props, element.metadata);
  }
  if (Object.keys(props).length > 0) {
    base.properties = props;
  }

  return base;
}

function toStructurizrRelationship(
  relationship: ArchitectureRelationship
): StructurizrRelationship {
  const result: StructurizrRelationship = {
    id: relationship.id,
    sourceId: relationship.source.id,
    destinationId: relationship.target.id,
    description: relationship.label,
  };

  if (relationship.technology !== undefined) {
    result.technology = relationship.technology;
  }

  const tags = relationshipTags(relationship);
  if (tags !== undefined) {
    result.tags = tags;
  }

  const props: Record<string, unknown> = {};
  if (relationship.metadata && Object.keys(relationship.metadata).length > 0) {
    Object.assign(props, relationship.metadata);
  }
  if (Object.keys(props).length > 0) {
    result.properties = props;
  }

  return result;
}

function toAutoLayout(
  direction: AutoLayoutDirection | undefined
): { rankDirection: string; rankSeparation: number; nodeSeparation: number } | undefined {
  if (direction === undefined) return undefined;
  return {
    rankDirection: AUTO_LAYOUT_MAP[direction],
    rankSeparation: 300,
    nodeSeparation: 300,
  };
}

function collectRelationshipsFor(
  elementIds: Set<string>,
  allRelationships: readonly ArchitectureRelationship[]
): StructurizrRelationship[] {
  return allRelationships
    .filter((r) => elementIds.has(r.source.id) || elementIds.has(r.target.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(toStructurizrRelationship);
}

function buildViews(views: readonly ArchitectureView[]): StructurizrViews {
  const result: StructurizrViews = {};
  const systemContextViews: StructurizrSystemContextView[] = [];
  const containerViews: StructurizrContainerView[] = [];

  for (const view of views) {
    const autoLayout = toAutoLayout(view.layoutDirection);

    if (view.kind === "systemContext") {
      systemContextViews.push({
        key: view.key,
        softwareSystemId: view.subject.id,
        description: view.title,
        ...(autoLayout !== undefined ? { autoLayout } : {}),
      });
    } else if (view.kind === "container") {
      containerViews.push({
        key: view.key,
        softwareSystemId: view.subject.id,
        description: view.title,
        ...(autoLayout !== undefined ? { autoLayout } : {}),
      });
    }
  }

  if (systemContextViews.length > 0) result.systemContextViews = systemContextViews;
  if (containerViews.length > 0) result.containerViews = containerViews;

  return result;
}

/**
 * Exports a DrawSpec Workspace to Structurizr-compatible JSON format.
 *
 * Mapping: person→Person, softwareSystem→SoftwareSystem,
 * container→Container, database→Container (with "Database" tag).
 * Deterministic: elements and relationships are sorted by ID.
 */
export function exportToStructurizr(workspace: Workspace): StructurizrWorkspace {
  const allElements = flattenElements(workspace.model.elements).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const allRelationships = [...workspace.model.relationships].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  const topLevelElements = allElements.filter((e) => e.parent === undefined);

  const people = topLevelElements
    .filter((e) => e.kind === "person")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      const person = toStructurizrElement(e) as StructurizrPerson;
      const ids = new Set([e.id]);
      person.relationships = collectRelationshipsFor(ids, allRelationships);
      if (person.relationships.length === 0) delete person.relationships;
      return person;
    });

  const softwareSystems = topLevelElements
    .filter((e) => e.kind === "softwareSystem")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      const sys = toStructurizrElement(e) as StructurizrSoftwareSystem;
      const childElements = allElements
        .filter((c) => c.parent?.id === e.id)
        .sort((a, b) => a.id.localeCompare(b.id));

      if (childElements.length > 0) {
        sys.containers = childElements.map((c) => toStructurizrElement(c) as StructurizrContainer);
      }

      const ids = new Set([e.id, ...childElements.map((c) => c.id)]);
      sys.relationships = collectRelationshipsFor(ids, allRelationships);
      if (sys.relationships.length === 0) delete sys.relationships;

      return sys;
    });

  const result: StructurizrWorkspace = {
    id: 0,
    name: workspace.name,
    model: {},
    views: buildViews(workspace.views.items),
  };

  if (people.length > 0) result.model.people = people;
  if (softwareSystems.length > 0) result.model.softwareSystems = softwareSystems;

  return result;
}
