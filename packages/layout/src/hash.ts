type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableValue(value: unknown): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
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

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value) ?? null);
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function stableContentHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = FNV_OFFSET;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}
