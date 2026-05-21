import type { ArchitectureRelationshipKind, C4ElementKind } from "@drawspec/architecture";
import type { ArchitectureData, SerializedElement, SerializedRelationship } from "./types";

export interface BrowserElementFilter {
  tags?: readonly string[];
  kind?: C4ElementKind;
  parentId?: string;
  nameQuery?: string;
}

export interface BrowserRelationshipFilter {
  sourceId?: string;
  targetId?: string;
  kind?: ArchitectureRelationshipKind;
  tags?: readonly string[];
}

export interface BrowserPathOptions {
  maxDepth?: number;
  direction?: "forward" | "reverse" | "both";
}

export interface BrowserPathResult {
  found: boolean;
  elements: SerializedElement[];
  relationships: SerializedRelationship[];
}

export interface BrowserQuery {
  elements(filter?: BrowserElementFilter): readonly SerializedElement[];
  relationships(filter?: BrowserRelationshipFilter): readonly SerializedRelationship[];
  path(fromId: string, toId: string, options?: BrowserPathOptions): BrowserPathResult;
  search(query: string, maxResults?: number): readonly SerializedElement[];
}

function matchesTags(tags: readonly string[], filterTags: readonly string[]): boolean {
  const required = new Set<string>();
  const negated = new Set<string>();
  for (const tag of filterTags) {
    if (tag.startsWith("!")) {
      negated.add(tag.slice(1));
    } else {
      required.add(tag);
    }
  }
  const entityTags = new Set(tags);
  for (const tag of required) {
    if (!entityTags.has(tag)) return false;
  }
  for (const tag of negated) {
    if (entityTags.has(tag)) return false;
  }
  return true;
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

function elementMatchesQuery(el: SerializedElement, normalized: string): boolean {
  if (normalized.length === 0) return true;
  const nameLower = el.name.toLowerCase();
  if (nameLower.includes(normalized)) return true;
  if (el.description?.toLowerCase().includes(normalized)) return true;
  for (const tag of el.tags) {
    if (tag.toLowerCase().includes(normalized)) return true;
  }
  const parts = normalized.split(/\s+/);
  if (parts.length > 1) {
    return parts.every((p) => elementMatchesQuery(el, p));
  }
  return false;
}

export function createBrowserQuery(data: ArchitectureData): BrowserQuery {
  const elementsById = new Map<string, SerializedElement>();
  for (const el of data.elements) {
    elementsById.set(el.id, el);
  }

  const relationshipsBySource = new Map<string, SerializedRelationship[]>();
  const relationshipsByTarget = new Map<string, SerializedRelationship[]>();
  for (const rel of data.relationships) {
    let src = relationshipsBySource.get(rel.sourceId);
    if (!src) {
      src = [];
      relationshipsBySource.set(rel.sourceId, src);
    }
    src.push(rel);

    let tgt = relationshipsByTarget.get(rel.targetId);
    if (!tgt) {
      tgt = [];
      relationshipsByTarget.set(rel.targetId, tgt);
    }
    tgt.push(rel);
  }

  function queryElements(filter?: BrowserElementFilter): readonly SerializedElement[] {
    if (!filter) return data.elements;
    return data.elements.filter((el) => {
      if (filter.kind !== undefined && el.kind !== filter.kind) return false;
      if (filter.tags !== undefined && filter.tags.length > 0 && !matchesTags(el.tags, filter.tags))
        return false;
      if (filter.parentId !== undefined && el.parentId !== filter.parentId) return false;
      if (
        filter.nameQuery !== undefined &&
        !elementMatchesQuery(el, normalizeQuery(filter.nameQuery))
      )
        return false;
      return true;
    });
  }

  function queryRelationships(
    filter?: BrowserRelationshipFilter
  ): readonly SerializedRelationship[] {
    if (!filter) return data.relationships;
    return data.relationships.filter((rel) => {
      if (filter.sourceId !== undefined && rel.sourceId !== filter.sourceId) return false;
      if (filter.targetId !== undefined && rel.targetId !== filter.targetId) return false;
      if (filter.kind !== undefined && rel.kind !== filter.kind) return false;
      if (
        filter.tags !== undefined &&
        filter.tags.length > 0 &&
        !matchesTags(rel.tags, filter.tags)
      )
        return false;
      return true;
    });
  }

  function queryPath(
    fromId: string,
    toId: string,
    options?: BrowserPathOptions
  ): BrowserPathResult {
    const maxDepth = options?.maxDepth ?? 20;
    const direction = options?.direction ?? "forward";

    if (fromId === toId) {
      const el = elementsById.get(fromId);
      return el
        ? { found: true, elements: [el], relationships: [] }
        : { found: false, elements: [], relationships: [] };
    }

    const adj = new Map<string, Array<{ neighborId: string; rel: SerializedRelationship }>>();
    for (const rel of data.relationships) {
      if (direction === "forward" || direction === "both") {
        let neighbors = adj.get(rel.sourceId);
        if (!neighbors) {
          neighbors = [];
          adj.set(rel.sourceId, neighbors);
        }
        neighbors.push({ neighborId: rel.targetId, rel });
      }
      if (direction === "reverse" || direction === "both") {
        let neighbors = adj.get(rel.targetId);
        if (!neighbors) {
          neighbors = [];
          adj.set(rel.targetId, neighbors);
        }
        neighbors.push({ neighborId: rel.sourceId, rel });
      }
    }

    const visited = new Set<string>();
    const parent = new Map<string, { elementId: string; rel: SerializedRelationship }>();
    const queue: Array<{ elementId: string; depth: number }> = [{ elementId: fromId, depth: 0 }];
    visited.add(fromId);

    let found = false;
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      if (item.depth >= maxDepth) continue;

      const neighbors = adj.get(item.elementId) ?? [];
      for (const { neighborId, rel } of neighbors) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        parent.set(neighborId, { elementId: item.elementId, rel });
        if (neighborId === toId) {
          found = true;
          break;
        }
        queue.push({ elementId: neighborId, depth: item.depth + 1 });
      }
      if (found) break;
    }

    if (!found) return { found: false, elements: [], relationships: [] };

    const pathElementIds: string[] = [toId];
    const pathRelationships: SerializedRelationship[] = [];
    let current = toId;
    while (current !== fromId) {
      const p = parent.get(current);
      if (!p) break;
      pathElementIds.push(p.elementId);
      pathRelationships.push(p.rel);
      current = p.elementId;
    }
    pathElementIds.reverse();
    pathRelationships.reverse();

    return {
      found: true,
      elements: pathElementIds
        .map((id) => elementsById.get(id))
        .filter((e): e is SerializedElement => !!e),
      relationships: pathRelationships,
    };
  }

  function search(query: string, maxResults?: number): readonly SerializedElement[] {
    const normalized = normalizeQuery(query);
    if (normalized.length === 0) return [];
    const limit = maxResults ?? 50;
    const results: SerializedElement[] = [];
    for (const el of data.elements) {
      if (results.length >= limit) break;
      if (elementMatchesQuery(el, normalized)) {
        results.push(el);
      }
    }
    return results;
  }

  return { elements: queryElements, relationships: queryRelationships, path: queryPath, search };
}
