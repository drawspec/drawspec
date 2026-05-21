import type {
  ArchitectureElement,
  ArchitectureRelationship,
  ArchitectureView,
  C4ElementKind,
  Workspace,
} from "./types";

export type LikeC4ElementKind = "actor" | "system" | "container" | "database" | "component";

export interface LikeC4Element {
  id: string;
  kind: LikeC4ElementKind;
  name: string;
  description?: string;
  technology?: string;
  tags?: string[];
  properties?: Record<string, unknown>;
  parent?: string;
}

export interface LikeC4Relation {
  id: string;
  source: string;
  target: string;
  title?: string;
  technology?: string;
  description?: string;
  tags?: string[];
  properties?: Record<string, unknown>;
}

export interface LikeC4View {
  id: string;
  title?: string;
  viewOf?: string;
  elements?: string[];
  autoLayout?: { direction: string };
}

export interface LikeC4Model {
  elements: LikeC4Element[];
  relations: LikeC4Relation[];
  views: LikeC4View[];
}

const ELEMENT_KIND_MAP: Record<C4ElementKind, LikeC4ElementKind> = {
  person: "actor",
  softwareSystem: "system",
  container: "container",
  database: "database",
};

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

function sanitizeLikeC4Id(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function toLikeC4Element(element: ArchitectureElement): LikeC4Element {
  const result: LikeC4Element = {
    id: sanitizeLikeC4Id(element.id),
    kind: ELEMENT_KIND_MAP[element.kind],
    name: element.name,
  };

  if (element.description !== undefined) {
    result.description = element.description;
  }
  if (element.technology !== undefined) {
    result.technology = element.technology;
  }

  const tags = [...element.tags].sort().filter((t) => t !== element.kind);
  if (tags.length > 0) {
    result.tags = tags;
  }

  if (element.parent !== undefined) {
    result.parent = sanitizeLikeC4Id(element.parent.id);
  }

  const props: Record<string, unknown> = {};
  if (element.properties && Object.keys(element.properties).length > 0) {
    Object.assign(props, element.properties);
  }
  if (element.metadata && Object.keys(element.metadata).length > 0) {
    Object.assign(props, element.metadata);
  }
  if (Object.keys(props).length > 0) {
    result.properties = props;
  }

  return result;
}

function toLikeC4Relation(relationship: ArchitectureRelationship): LikeC4Relation {
  const result: LikeC4Relation = {
    id: sanitizeLikeC4Id(relationship.id),
    source: sanitizeLikeC4Id(relationship.source.id),
    target: sanitizeLikeC4Id(relationship.target.id),
  };

  if (relationship.label.trim().length > 0) {
    result.title = relationship.label;
  }
  if (relationship.technology !== undefined) {
    result.technology = relationship.technology;
  }
  if (relationship.description !== undefined) {
    result.description = relationship.description;
  }

  const tags = [...relationship.tags].sort().filter((t) => t !== "relationship" && t !== "uses");
  if (tags.length > 0) {
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

const VIEW_DIRECTION_MAP: Record<string, string> = {
  "left-right": "LeftRight",
  "right-left": "RightLeft",
  "top-down": "TopBottom",
  "bottom-up": "BottomTop",
};

function toLikeC4View(view: ArchitectureView): LikeC4View {
  const result: LikeC4View = {
    id: sanitizeLikeC4Id(view.id),
    title: view.title,
    viewOf: sanitizeLikeC4Id(view.subject.id),
  };

  if (view.layoutDirection !== undefined) {
    result.autoLayout = { direction: VIEW_DIRECTION_MAP[view.layoutDirection] ?? "TopBottom" };
  }

  if (view.includedElements.length > 0) {
    result.elements = view.includedElements.map((e) => sanitizeLikeC4Id(e.id));
  }

  return result;
}

/**
 * Exports a DrawSpec Workspace to LikeC4-compatible model format.
 *
 * Mapping: person→actor, softwareSystem→system,
 * container→container, database→database.
 * Deterministic: elements and relations are sorted by ID.
 */
export function exportToLikeC4(workspace: Workspace): LikeC4Model {
  const allElements = flattenElements(workspace.model.elements).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const allRelationships = [...workspace.model.relationships].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  return {
    elements: allElements.map(toLikeC4Element),
    relations: allRelationships.map(toLikeC4Relation),
    views: [...workspace.views.items].sort((a, b) => a.id.localeCompare(b.id)).map(toLikeC4View),
  };
}
