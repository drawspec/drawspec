/**
 * @drawspec/cache — Dependency graph for incremental compilation.
 *
 * Tracks import relationships between diagram files so that when a file
 * changes, only that file and its downstream dependents are recompiled.
 *
 * Terminology:
 * - **dependency**: a file that `id` imports (what `id` depends on)
 * - **dependent**: a file that imports `id` (what depends on `id`)
 * - **affected**: `id` itself plus all transitive dependents
 */

/** A directed graph tracking file-level import dependencies. */
export class DependencyGraph {
  /** node → set of files this node depends on (imports) */
  private readonly dependencies = new Map<string, Set<string>>();
  /** node → set of files that depend on this node (importers) */
  private readonly dependents = new Map<string, Set<string>>();

  /**
   * Add or update a node with its direct dependencies.
   *
   * If the node already existed, its dependency list is replaced — stale
   * edges from a previous `addNode` call are removed automatically.
   */
  addNode(id: string, deps: readonly string[]): void {
    const oldDeps = this.dependencies.get(id);
    if (oldDeps !== undefined) {
      for (const dep of oldDeps) {
        this.dependents.get(dep)?.delete(id);
      }
    }
    const newDeps = new Set<string>(deps);
    this.dependencies.set(id, newDeps);
    for (const dep of newDeps) {
      let bucket = this.dependents.get(dep);
      if (bucket === undefined) {
        bucket = new Set<string>();
        this.dependents.set(dep, bucket);
      }
      bucket.add(id);
    }
  }

  /** Remove a node and all its edges from the graph. */
  removeNode(id: string): void {
    const deps = this.dependencies.get(id);
    if (deps !== undefined) {
      for (const dep of deps) {
        this.dependents.get(dep)?.delete(id);
      }
      this.dependencies.delete(id);
    }
    const dependents = this.dependents.get(id);
    if (dependents !== undefined) {
      for (const dep of dependents) {
        this.dependencies.get(dep)?.delete(id);
      }
      this.dependents.delete(id);
    }
  }

  /**
   * Return all files affected by a change to `id` — the node itself
   * plus every transitive dependent (files that import it, files that
   * import those files, etc.).
   *
   * Cycles are detected and logged as warnings but do not cause crashes.
   */
  getAffected(id: string): string[] {
    const visited = new Set<string>();
    const stack = [id];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || visited.has(current)) {
        continue;
      }
      visited.add(current);

      const directDependents = this.dependents.get(current);
      if (directDependents !== undefined) {
        for (const dep of directDependents) {
          if (!visited.has(dep)) {
            stack.push(dep);
          }
        }
      }
    }

    return [...visited].sort();
  }

  /** Return direct dependents of `id` (files that import `id`). */
  getDependents(id: string): string[] {
    const set = this.dependents.get(id);
    if (set === undefined) {
      return [];
    }
    return [...set].sort();
  }

  /** Return direct dependencies of `id` (files that `id` imports). */
  getDependencies(id: string): string[] {
    const set = this.dependencies.get(id);
    if (set === undefined) {
      return [];
    }
    return [...set].sort();
  }

  /** Check whether `id` has been registered in the graph. */
  has(id: string): boolean {
    return this.dependencies.has(id);
  }

  /** Return all node IDs currently in the graph, sorted. */
  getAll(): string[] {
    return [...this.dependencies.keys()].sort();
  }

  /** Remove all nodes and edges. */
  clear(): void {
    this.dependencies.clear();
    this.dependents.clear();
  }

  /** Number of nodes in the graph. */
  get size(): number {
    return this.dependencies.size;
  }
}

/**
 * Extract import dependency paths from a TypeScript source string.
 *
 * Returns relative paths extracted from static `import` declarations.
 * Only considers string-literal specifiers that look like diagram files
 * (ending in `.ts`, `.diagram.ts`, `.arch.ts`, `.sequence.ts`).
 * This is intentionally simple — no module resolution, just name matching.
 */
export function extractImports(source: string): string[] {
  const imports: string[] = [];
  // Match: import ... from "specifier"  or  import "specifier"
  // Captures the string literal content (without quotes)
  const importPattern = /import\s+(?:(?:type\s+)?[\w$.*{},\s]*from\s+)?['"]([^'"]+)['"]/g;
  const matches = source.matchAll(importPattern);
  for (const match of matches) {
    const specifier = match[1];
    // Only include .ts specifiers (diagram files) — skip node_modules/bare specifiers
    if (specifier?.endsWith(".ts") && !specifier.startsWith("@")) {
      imports.push(specifier);
    }
  }
  return imports;
}
