import type { ArchitectureStyles } from "./types";

export class ArchitectureStylesImpl implements ArchitectureStyles {
  #rules: Record<string, Record<string, string | number>> = {};

  get stylesheet(): ArchitectureStyles["stylesheet"] {
    return { rules: { ...this.#rules } };
  }

  element(tag: string, options: Record<string, string | number>): void {
    this.#rules[`element:${tag}`] = { ...options };
  }

  relationship(tag: string, options: Record<string, string | number>): void {
    this.#rules[`relationship:${tag}`] = { ...options };
  }
}
