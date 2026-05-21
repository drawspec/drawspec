import type { ArchitectureElement, ArchitectureRelationship, Workspace } from "./types";

export type DriftChangeType = "added" | "removed" | "modified";

export interface DriftPropertyDiff {
  readonly before: unknown;
  readonly after: unknown;
}

export interface DriftChange {
  readonly type: DriftChangeType;
  readonly elementType: "element" | "relationship";
  readonly id: string;
  readonly name?: string | undefined;
  readonly details?: Record<string, DriftPropertyDiff>;
}

export interface DriftReport {
  readonly timestamp: string;
  readonly summary: {
    readonly elementsAdded: number;
    readonly elementsRemoved: number;
    readonly elementsModified: number;
    readonly relationshipsAdded: number;
    readonly relationshipsRemoved: number;
    readonly relationshipsModified: number;
    readonly totalChanges: number;
  };
  readonly changes: readonly DriftChange[];
}

export interface SnapshotElement {
  readonly id: string;
  readonly kind: ArchitectureElement["kind"];
  readonly name: string;
  readonly description?: string;
  readonly technology?: string;
  readonly tags: readonly string[];
  readonly parentId?: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly owner?: ArchitectureElement["owner"];
}

export interface SnapshotRelationship {
  readonly id: string;
  readonly kind: ArchitectureRelationship["kind"];
  readonly sourceId: string;
  readonly destinationId: string;
  readonly label: string;
  readonly description?: string;
  readonly technology?: string;
  readonly protocol?: string;
  readonly direction: ArchitectureRelationship["direction"];
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ModelSnapshot {
  readonly timestamp: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly elements: readonly SnapshotElement[];
  readonly relationships: readonly SnapshotRelationship[];
}

export interface CodeMetadataElement {
  readonly id: string;
  readonly name?: string;
  readonly tags?: readonly string[];
}

export interface CodeMetadataRelationship {
  readonly id: string;
  readonly sourceId?: string;
  readonly destinationId?: string;
  readonly label?: string;
  readonly technology?: string;
  readonly tags?: readonly string[];
}

export interface CodeMetadata {
  readonly elements: readonly CodeMetadataElement[];
  readonly relationships?: readonly CodeMetadataRelationship[];
}

const ELEMENT_FIELDS = [
  "kind",
  "name",
  "description",
  "technology",
  "tags",
  "parentId",
  "properties",
  "owner",
] as const satisfies readonly (keyof SnapshotElement)[];

const RELATIONSHIP_FIELDS = [
  "kind",
  "sourceId",
  "destinationId",
  "label",
  "description",
  "technology",
  "protocol",
  "direction",
  "tags",
  "metadata",
] as const satisfies readonly (keyof SnapshotRelationship)[];

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cloneValue(item)])
    );
  }
  return value;
}

function normalizeTags(tags: readonly string[] | undefined): readonly string[] {
  return [...new Set(tags ?? [])].sort();
}

function flattenElements(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  const result: ArchitectureElement[] = [];
  const stack = [...elements].reverse();
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) break;
    result.push(element);
    for (let i = element.children.length - 1; i >= 0; i--) {
      const child = element.children[i];
      if (child !== undefined) stack.push(child);
    }
  }
  return result;
}

function snapshotElement(element: ArchitectureElement): SnapshotElement {
  return {
    id: element.id,
    kind: element.kind,
    name: element.name,
    ...(element.description !== undefined ? { description: element.description } : {}),
    ...(element.technology !== undefined ? { technology: element.technology } : {}),
    tags: [...element.tags],
    ...(element.parent !== undefined ? { parentId: element.parent.id } : {}),
    properties: cloneValue(element.properties) as Record<string, unknown>,
    ...(element.owner !== undefined
      ? { owner: cloneValue(element.owner) as ArchitectureElement["owner"] }
      : {}),
  };
}

function snapshotRelationship(relationship: ArchitectureRelationship): SnapshotRelationship {
  return {
    id: relationship.id,
    kind: relationship.kind,
    sourceId: relationship.source.id,
    destinationId: relationship.target.id,
    label: relationship.label,
    ...(relationship.description !== undefined ? { description: relationship.description } : {}),
    ...(relationship.technology !== undefined ? { technology: relationship.technology } : {}),
    ...(relationship.protocol !== undefined ? { protocol: relationship.protocol } : {}),
    direction: relationship.direction,
    tags: [...relationship.tags],
    metadata: cloneValue(relationship.metadata) as Record<string, unknown>,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
}

function stableKey(value: unknown): string {
  return value === undefined ? "__drawspec_undefined__" : JSON.stringify(stableValue(value));
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return stableKey(left) === stableKey(right);
}

function diffFields<T extends object, K extends keyof T>(
  before: T,
  after: T,
  fields: readonly K[]
): Record<string, DriftPropertyDiff> | undefined {
  const details: Record<string, DriftPropertyDiff> = {};
  for (const field of fields) {
    const beforeValue =
      field === "tags" ? normalizeTags(before[field] as readonly string[]) : before[field];
    const afterValue =
      field === "tags" ? normalizeTags(after[field] as readonly string[]) : after[field];
    if (!valuesEqual(beforeValue, afterValue)) {
      details[String(field)] = {
        before: cloneValue(beforeValue),
        after: cloneValue(afterValue),
      };
    }
  }
  return Object.keys(details).length > 0 ? details : undefined;
}

function byId<T extends { readonly id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function sortById<T extends { readonly id: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function makeReport(changes: readonly DriftChange[]): DriftReport {
  const elementsAdded = changes.filter(
    (change) => change.elementType === "element" && change.type === "added"
  ).length;
  const elementsRemoved = changes.filter(
    (change) => change.elementType === "element" && change.type === "removed"
  ).length;
  const elementsModified = changes.filter(
    (change) => change.elementType === "element" && change.type === "modified"
  ).length;
  const relationshipsAdded = changes.filter(
    (change) => change.elementType === "relationship" && change.type === "added"
  ).length;
  const relationshipsRemoved = changes.filter(
    (change) => change.elementType === "relationship" && change.type === "removed"
  ).length;
  const relationshipsModified = changes.filter(
    (change) => change.elementType === "relationship" && change.type === "modified"
  ).length;
  const totalChanges = changes.length;

  return {
    timestamp: new Date().toISOString(),
    summary: {
      elementsAdded,
      elementsRemoved,
      elementsModified,
      relationshipsAdded,
      relationshipsRemoved,
      relationshipsModified,
      totalChanges,
    },
    changes: [...changes],
  };
}

function changedName(
  before: { readonly name?: string; readonly label?: string } | undefined,
  after: { readonly name?: string; readonly label?: string } | undefined
): string | undefined {
  return after?.name ?? before?.name ?? after?.label ?? before?.label;
}

export function snapshotModel(model: Workspace): ModelSnapshot {
  return {
    timestamp: new Date().toISOString(),
    workspaceId: model.id,
    workspaceName: model.name,
    elements: sortById(flattenElements(model.model.elements).map(snapshotElement)),
    relationships: sortById(model.model.relationships.map(snapshotRelationship)),
  };
}

export function compareSnapshots(before: ModelSnapshot, after: ModelSnapshot): DriftReport {
  const changes: DriftChange[] = [];
  const beforeElements = byId(before.elements);
  const afterElements = byId(after.elements);

  for (const element of sortById(after.elements)) {
    if (!beforeElements.has(element.id)) {
      changes.push({ type: "added", elementType: "element", id: element.id, name: element.name });
    }
  }
  for (const element of sortById(before.elements)) {
    if (!afterElements.has(element.id)) {
      changes.push({ type: "removed", elementType: "element", id: element.id, name: element.name });
    }
  }
  for (const element of sortById(after.elements)) {
    const previous = beforeElements.get(element.id);
    if (previous === undefined) continue;
    const details = diffFields(previous, element, ELEMENT_FIELDS);
    if (details !== undefined) {
      changes.push({
        type: "modified",
        elementType: "element",
        id: element.id,
        name: changedName(previous, element),
        details,
      });
    }
  }

  const beforeRelationships = byId(before.relationships);
  const afterRelationships = byId(after.relationships);
  for (const relationship of sortById(after.relationships)) {
    if (!beforeRelationships.has(relationship.id)) {
      changes.push({
        type: "added",
        elementType: "relationship",
        id: relationship.id,
        name: relationship.label,
      });
    }
  }
  for (const relationship of sortById(before.relationships)) {
    if (!afterRelationships.has(relationship.id)) {
      changes.push({
        type: "removed",
        elementType: "relationship",
        id: relationship.id,
        name: relationship.label,
      });
    }
  }
  for (const relationship of sortById(after.relationships)) {
    const previous = beforeRelationships.get(relationship.id);
    if (previous === undefined) continue;
    const details = diffFields(previous, relationship, RELATIONSHIP_FIELDS);
    if (details !== undefined) {
      changes.push({
        type: "modified",
        elementType: "relationship",
        id: relationship.id,
        name: changedName(previous, relationship),
        details,
      });
    }
  }

  return makeReport(changes);
}

function optionalDiff(
  details: Record<string, DriftPropertyDiff>,
  field: string,
  before: unknown,
  after: unknown
): void {
  if (after === undefined) return;
  const normalizedBefore = field === "tags" ? normalizeTags(before as readonly string[]) : before;
  const normalizedAfter = field === "tags" ? normalizeTags(after as readonly string[]) : after;
  if (!valuesEqual(normalizedBefore, normalizedAfter)) {
    details[field] = { before: cloneValue(normalizedBefore), after: cloneValue(normalizedAfter) };
  }
}

export function detectDrift(model: Workspace, codeMetadata: CodeMetadata): DriftReport {
  const snapshot = snapshotModel(model);
  const codeElements = byId(codeMetadata.elements);
  const modelElements = byId(snapshot.elements);
  const changes: DriftChange[] = [];

  for (const element of sortById(codeMetadata.elements)) {
    if (!modelElements.has(element.id)) {
      changes.push({ type: "added", elementType: "element", id: element.id, name: element.name });
    }
  }
  for (const element of sortById(snapshot.elements)) {
    if (!codeElements.has(element.id)) {
      changes.push({ type: "removed", elementType: "element", id: element.id, name: element.name });
    }
  }
  for (const element of sortById(snapshot.elements)) {
    const codeElement = codeElements.get(element.id);
    if (codeElement === undefined) continue;
    const details: Record<string, DriftPropertyDiff> = {};
    optionalDiff(details, "name", element.name, codeElement.name);
    optionalDiff(details, "tags", element.tags, codeElement.tags);
    if (Object.keys(details).length > 0) {
      changes.push({
        type: "modified",
        elementType: "element",
        id: element.id,
        name: codeElement.name ?? element.name,
        details,
      });
    }
  }

  if (codeMetadata.relationships !== undefined) {
    const codeRelationships = byId(codeMetadata.relationships);
    const modelRelationships = byId(snapshot.relationships);
    for (const relationship of sortById(codeMetadata.relationships)) {
      if (!modelRelationships.has(relationship.id)) {
        changes.push({
          type: "added",
          elementType: "relationship",
          id: relationship.id,
          name: relationship.label,
        });
      }
    }
    for (const relationship of sortById(snapshot.relationships)) {
      if (!codeRelationships.has(relationship.id)) {
        changes.push({
          type: "removed",
          elementType: "relationship",
          id: relationship.id,
          name: relationship.label,
        });
      }
    }
    for (const relationship of sortById(snapshot.relationships)) {
      const codeRelationship = codeRelationships.get(relationship.id);
      if (codeRelationship === undefined) continue;
      const details: Record<string, DriftPropertyDiff> = {};
      optionalDiff(details, "sourceId", relationship.sourceId, codeRelationship.sourceId);
      optionalDiff(
        details,
        "destinationId",
        relationship.destinationId,
        codeRelationship.destinationId
      );
      optionalDiff(details, "label", relationship.label, codeRelationship.label);
      optionalDiff(details, "technology", relationship.technology, codeRelationship.technology);
      optionalDiff(details, "tags", relationship.tags, codeRelationship.tags);
      if (Object.keys(details).length > 0) {
        changes.push({
          type: "modified",
          elementType: "relationship",
          id: relationship.id,
          name: codeRelationship.label ?? relationship.label,
          details,
        });
      }
    }
  }

  return makeReport(changes);
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  return JSON.stringify(stableValue(value));
}

function formatDetails(details: Record<string, DriftPropertyDiff> | undefined): string {
  if (details === undefined || Object.keys(details).length === 0) return "";
  const parts = Object.entries(details)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([field, diff]) => `${field}: ${formatValue(diff.before)} → ${formatValue(diff.after)}`);
  return ` (${parts.join("; ")})`;
}

function section(title: string, changes: readonly DriftChange[]): string[] {
  const lines = [`## ${title}`];
  if (changes.length === 0) {
    lines.push("", "_None_");
    return lines;
  }
  lines.push("");
  for (const change of changes) {
    const label = change.name !== undefined ? ` (${change.name})` : "";
    lines.push(`- **${change.type}** \`${change.id}\`${label}${formatDetails(change.details)}`);
  }
  return lines;
}

export function generateDriftReport(drift: DriftReport): string {
  const addedElements = drift.changes.filter(
    (change) => change.elementType === "element" && change.type === "added"
  );
  const removedElements = drift.changes.filter(
    (change) => change.elementType === "element" && change.type === "removed"
  );
  const modifiedElements = drift.changes.filter(
    (change) => change.elementType === "element" && change.type === "modified"
  );
  const relationshipChanges = drift.changes.filter(
    (change) => change.elementType === "relationship"
  );

  const lines = [
    "# Drift Report",
    "",
    `Generated: ${drift.timestamp}`,
    "",
    "## Summary",
    "",
    `- Elements added: ${drift.summary.elementsAdded}`,
    `- Elements removed: ${drift.summary.elementsRemoved}`,
    `- Elements modified: ${drift.summary.elementsModified}`,
    `- Relationships added: ${drift.summary.relationshipsAdded}`,
    `- Relationships removed: ${drift.summary.relationshipsRemoved}`,
    `- Relationships modified: ${drift.summary.relationshipsModified}`,
    `- Total changes: ${drift.summary.totalChanges}`,
  ];

  if (drift.summary.totalChanges === 0) {
    lines.push("", "No drift detected.");
  }

  lines.push(
    "",
    ...section("Added Elements", addedElements),
    "",
    ...section("Removed Elements", removedElements),
    "",
    ...section("Modified Elements", modifiedElements),
    "",
    ...section("Relationship Changes", relationshipChanges)
  );

  return lines.join("\n");
}
