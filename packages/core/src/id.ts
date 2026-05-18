import { createIdCollisionDiagnostic, type Diagnostic } from "./diagnostic";
import { stableStringify } from "./serialize";

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

function fnv1a64(input: string): string {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < input.length; index += 1) {
    const codePoint = input.codePointAt(index);
    if (codePoint === undefined) {
      continue;
    }

    hash ^= BigInt(codePoint);
    hash = (hash * FNV_PRIME) & UINT64_MASK;

    if (codePoint > 0xffff) {
      index += 1;
    }
  }

  return hash.toString(16).padStart(16, "0");
}

export interface CreateIdOptions {
  prefix?: string;
  length?: number;
}

export function createDeterministicId(input: unknown, options: CreateIdOptions = {}): string {
  const prefix = options.prefix ?? "ds";
  const length = options.length ?? 16;
  const payload = stableStringify(input);
  const digest = fnv1a64(payload).slice(0, length);

  return `${prefix}_${digest}`;
}

export class IdRegistry {
  readonly ids = new Set<string>();

  registerId(id: string): Diagnostic | null {
    if (this.ids.has(id)) {
      return createIdCollisionDiagnostic(id);
    }

    this.ids.add(id);
    return null;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  clear(): void {
    this.ids.clear();
  }
}
