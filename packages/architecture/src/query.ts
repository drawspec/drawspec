import type {
  ArchitectureElement,
  ArchitectureModel,
  ArchitectureRelationship,
  ArchitectureRelationshipKind,
} from "./types";

export interface ElementQueryFilter {
  tags?: readonly string[];
  kind?: ArchitectureElement["kind"];
  parent?: ArchitectureElement;
}

export interface RelationshipQueryFilter {
  source?: ArchitectureElement;
  target?: ArchitectureElement;
  kind?: ArchitectureRelationshipKind;
  tags?: readonly string[];
}

export interface PathQueryOptions {
  maxDepth?: number;
  direction?: "forward" | "reverse" | "both";
}

export interface PathResult {
  readonly found: boolean;
  readonly elements: readonly ArchitectureElement[];
  readonly relationships: readonly ArchitectureRelationship[];
}

export interface WorkspaceQuery {
  elements(filter?: ElementQueryFilter): readonly ArchitectureElement[];
  relationships(filter?: RelationshipQueryFilter): readonly ArchitectureRelationship[];
  path(from: ArchitectureElement, to: ArchitectureElement, options?: PathQueryOptions): PathResult;
}

function matchesTags(
  entity: { readonly tags: readonly string[] },
  filterTags: readonly string[]
): boolean {
  const required = new Set<string>();
  const negated = new Set<string>();
  for (const tag of filterTags) {
    if (tag.startsWith("!")) {
      negated.add(tag.slice(1));
    } else {
      required.add(tag);
    }
  }
  const entityTags = new Set(entity.tags);
  for (const tag of required) {
    if (!entityTags.has(tag)) return false;
  }
  for (const tag of negated) {
    if (entityTags.has(tag)) return false;
  }
  return true;
}

function flattenElements(model: ArchitectureModel): ArchitectureElement[] {
  const result: ArchitectureElement[] = [];
  const stack = [...model.elements];
  while (stack.length > 0) {
    const el = stack.pop();
    if (!el) break;
    result.push(el);
    for (let i = el.children.length - 1; i >= 0; i--) {
      stack.push(el.children[i] as ArchitectureElement);
    }
  }
  return result;
}

function queryElements(
  model: ArchitectureModel,
  filter?: ElementQueryFilter
): readonly ArchitectureElement[] {
  const all = flattenElements(model);
  if (!filter) return all;
  return all.filter((el) => {
    if (filter.kind !== undefined && el.kind !== filter.kind) return false;
    if (filter.tags !== undefined && filter.tags.length > 0 && !matchesTags(el, filter.tags))
      return false;
    if (filter.parent !== undefined && el.parent !== filter.parent) return false;
    return true;
  });
}

function queryRelationships(
  model: ArchitectureModel,
  filter?: RelationshipQueryFilter
): readonly ArchitectureRelationship[] {
  if (!filter) return model.relationships;
  return model.relationships.filter((rel) => {
    if (filter.source !== undefined && rel.source !== filter.source) return false;
    if (filter.target !== undefined && rel.target !== filter.target) return false;
    if (filter.kind !== undefined && rel.kind !== filter.kind) return false;
    if (filter.tags !== undefined && filter.tags.length > 0 && !matchesTags(rel, filter.tags))
      return false;
    return true;
  });
}

function queryPath(
  model: ArchitectureModel,
  from: ArchitectureElement,
  to: ArchitectureElement,
  options?: PathQueryOptions
): PathResult {
  const maxDepth = options?.maxDepth ?? 20;
  const direction = options?.direction ?? "forward";

  if (from === to) {
    return { found: true, elements: [from], relationships: [] };
  }

  const adj = new Map<
    string,
    Array<{ neighbor: ArchitectureElement; rel: ArchitectureRelationship }>
  >();
  for (const rel of model.relationships) {
    if (direction === "forward" || direction === "both") {
      let neighbors = adj.get(rel.source.id);
      if (!neighbors) {
        neighbors = [];
        adj.set(rel.source.id, neighbors);
      }
      neighbors.push({ neighbor: rel.target, rel });
    }
    if (direction === "reverse" || direction === "both") {
      let neighbors = adj.get(rel.target.id);
      if (!neighbors) {
        neighbors = [];
        adj.set(rel.target.id, neighbors);
      }
      neighbors.push({ neighbor: rel.source, rel });
    }
  }

  const visited = new Set<string>();
  const parent = new Map<string, { element: ArchitectureElement; rel: ArchitectureRelationship }>();
  const queue: Array<{ element: ArchitectureElement; depth: number }> = [
    { element: from, depth: 0 },
  ];
  visited.add(from.id);

  let found = false;
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { element, depth } = item;
    if (depth >= maxDepth) continue;

    const neighbors = adj.get(element.id) ?? [];
    for (const { neighbor, rel } of neighbors) {
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);
      parent.set(neighbor.id, { element, rel });
      if (neighbor === to) {
        found = true;
        break;
      }
      queue.push({ element: neighbor, depth: depth + 1 });
    }
    if (found) break;
  }

  if (!found) {
    return { found: false, elements: [], relationships: [] };
  }

  const pathElements: ArchitectureElement[] = [to];
  const pathRelationships: ArchitectureRelationship[] = [];
  let current = to;
  while (current !== from) {
    const p = parent.get(current.id);
    if (!p) break;
    pathElements.push(p.element);
    pathRelationships.push(p.rel);
    current = p.element;
  }
  pathElements.reverse();
  pathRelationships.reverse();

  return { found: true, elements: pathElements, relationships: pathRelationships };
}

export function createQuery(model: ArchitectureModel): WorkspaceQuery {
  return {
    elements: (filter?: ElementQueryFilter) => queryElements(model, filter),
    relationships: (filter?: RelationshipQueryFilter) => queryRelationships(model, filter),
    path: (from: ArchitectureElement, to: ArchitectureElement, options?: PathQueryOptions) =>
      queryPath(model, from, to, options),
  };
}
