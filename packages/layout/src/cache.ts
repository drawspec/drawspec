import { stableContentHash } from "./hash";
import { normalizeLayoutOptions } from "./options";
import type { DiagramDocument, LayoutOptions, PositionedDiagram } from "./types";

export interface LayoutCacheEntry {
  key: string;
  value: PositionedDiagram;
}

export class LayoutCache {
  readonly #entries: Record<string, PositionedDiagram> = {};

  keyFor(document: DiagramDocument, options: LayoutOptions = {}): string {
    return stableContentHash({ document, options: normalizeLayoutOptions(document, options) });
  }

  get(document: DiagramDocument, options: LayoutOptions = {}): PositionedDiagram | undefined {
    return this.#entries[this.keyFor(document, options)];
  }

  set(
    document: DiagramDocument,
    options: LayoutOptions,
    value: PositionedDiagram
  ): LayoutCacheEntry {
    const key = this.keyFor(document, options);
    this.#entries[key] = value;
    return { key, value };
  }

  has(document: DiagramDocument, options: LayoutOptions = {}): boolean {
    return this.keyFor(document, options) in this.#entries;
  }

  clear(): void {
    Object.keys(this.#entries).forEach((key) => {
      delete this.#entries[key];
    });
  }
}

export function createCachedLayout<Args extends [DiagramDocument, LayoutOptions | undefined]>(
  cache: LayoutCache,
  create: (...args: Args) => PositionedDiagram
): (...args: Args) => Promise<PositionedDiagram> {
  return async (...args) => {
    const [document, options] = args;
    const cached = cache.get(document, options);
    if (cached !== undefined) {
      return cached;
    }

    const positioned = create(...args);
    cache.set(document, options ?? {}, positioned);
    return positioned;
  };
}
