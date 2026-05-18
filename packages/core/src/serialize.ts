import type { DiagramDocument } from "./types";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stableValue(value: unknown): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const stableItem = stableValue(item);
      return stableItem === undefined ? null : stableItem;
    });
  }

  if (!isPlainObject(value)) {
    return String(value);
  }

  const sorted: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(value).sort()) {
    const stableChild = stableValue(value[key]);
    if (stableChild !== undefined) {
      sorted[key] = stableChild;
    }
  }

  return sorted;
}

export function stableStringify(value: unknown): string {
  const stable = stableValue(value);
  return JSON.stringify(stable === undefined ? null : stable);
}

export function serializeDocument(doc: DiagramDocument): string {
  return stableStringify(doc);
}
