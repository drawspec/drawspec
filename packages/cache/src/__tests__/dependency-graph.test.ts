import { describe, expect, test } from "bun:test";
import { DependencyGraph, extractImports } from "../dependency-graph";

describe("DependencyGraph", () => {
  test("starts empty", () => {
    const graph = new DependencyGraph();
    expect(graph.size).toBe(0);
    expect(graph.getAll()).toEqual([]);
  });

  test("addNode registers a node", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    expect(graph.has("a.ts")).toBe(true);
    expect(graph.size).toBe(1);
    expect(graph.getAll()).toEqual(["a.ts"]);
  });

  test("addNode with dependencies creates edges", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    expect(graph.getDependencies("b.ts")).toEqual(["a.ts"]);
    expect(graph.getDependents("a.ts")).toEqual(["b.ts"]);
  });

  test("addNode replaces existing dependencies", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("c.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    expect(graph.getDependents("a.ts")).toEqual(["b.ts"]);

    graph.addNode("b.ts", ["c.ts"]);
    expect(graph.getDependencies("b.ts")).toEqual(["c.ts"]);
    expect(graph.getDependents("a.ts")).toEqual([]);
    expect(graph.getDependents("c.ts")).toEqual(["b.ts"]);
  });

  test("removeNode removes the node and all its edges", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    graph.removeNode("b.ts");
    expect(graph.has("b.ts")).toBe(false);
    expect(graph.getDependents("a.ts")).toEqual([]);
    expect(graph.getDependencies("b.ts")).toEqual([]);
  });

  test("removeNode cleans up reverse edges when removing a dependency", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    graph.removeNode("a.ts");
    expect(graph.getDependencies("b.ts")).toEqual([]);
    expect(graph.has("a.ts")).toBe(false);
  });

  test("removeNode on unknown node is a no-op", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    expect(() => graph.removeNode("unknown.ts")).not.toThrow();
    expect(graph.size).toBe(1);
  });

  test("getAffected returns only the node when it has no dependents", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    expect(graph.getAffected("a.ts")).toEqual(["a.ts"]);
  });

  test("getAffected cascades through transitive dependents", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    graph.addNode("c.ts", ["b.ts"]);
    graph.addNode("d.ts", ["c.ts"]);

    const affected = graph.getAffected("a.ts");
    expect(affected).toEqual(["a.ts", "b.ts", "c.ts", "d.ts"]);
  });

  test("getAffected returns node plus direct dependents", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    graph.addNode("c.ts", ["a.ts"]);

    const affected = graph.getAffected("a.ts");
    expect(affected).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  test("getAffected for mid-chain node includes only downstream", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    graph.addNode("c.ts", ["b.ts"]);

    const affected = graph.getAffected("b.ts");
    expect(affected).toEqual(["b.ts", "c.ts"]);
  });

  test("getAffected for unknown node returns just that node", () => {
    const graph = new DependencyGraph();
    expect(graph.getAffected("unknown.ts")).toEqual(["unknown.ts"]);
  });

  test("getAffected handles cycles without infinite loop", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", ["b.ts"]);
    graph.addNode("b.ts", ["a.ts"]);

    const affected = graph.getAffected("a.ts");
    expect(affected.sort()).toEqual(["a.ts", "b.ts"]);
  });

  test("getAffected handles three-node cycle", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", ["c.ts"]);
    graph.addNode("b.ts", ["a.ts"]);
    graph.addNode("c.ts", ["b.ts"]);

    const affected = graph.getAffected("a.ts");
    expect(affected.sort()).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  test("getAffected handles diamond dependency", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    graph.addNode("c.ts", ["a.ts"]);
    graph.addNode("d.ts", ["b.ts", "c.ts"]);

    const affected = graph.getAffected("a.ts");
    expect(affected).toEqual(["a.ts", "b.ts", "c.ts", "d.ts"]);
  });

  test("getDependents returns empty for unknown node", () => {
    const graph = new DependencyGraph();
    expect(graph.getDependents("unknown.ts")).toEqual([]);
  });

  test("getDependencies returns empty for unknown node", () => {
    const graph = new DependencyGraph();
    expect(graph.getDependencies("unknown.ts")).toEqual([]);
  });

  test("clear removes everything", () => {
    const graph = new DependencyGraph();
    graph.addNode("a.ts", []);
    graph.addNode("b.ts", ["a.ts"]);
    graph.clear();
    expect(graph.size).toBe(0);
    expect(graph.getAll()).toEqual([]);
  });

  test("multiple nodes with shared dependency", () => {
    const graph = new DependencyGraph();
    graph.addNode("shared.ts", []);
    graph.addNode("a.ts", ["shared.ts"]);
    graph.addNode("b.ts", ["shared.ts"]);

    expect(graph.getDependents("shared.ts")).toEqual(["a.ts", "b.ts"]);

    const affected = graph.getAffected("shared.ts");
    expect(affected).toEqual(["a.ts", "b.ts", "shared.ts"]);
  });
});

describe("extractImports", () => {
  test("extracts static import specifiers ending in .ts", () => {
    const source = `
import { foo } from "./shared.diagram.ts";
import type { Bar } from "./types.arch.ts";
    `;
    const imports = extractImports(source);
    expect(imports).toEqual(["./shared.diagram.ts", "./types.arch.ts"]);
  });

  test("ignores bare module specifiers", () => {
    const source = `import { something } from "@drawspec/core";`;
    expect(extractImports(source)).toEqual([]);
  });

  test("ignores non-.ts specifiers", () => {
    const source = `import { data } from "./data.json";`;
    expect(extractImports(source)).toEqual([]);
  });

  test("extracts side-effect imports", () => {
    const source = `import "./setup.diagram.ts";`;
    expect(extractImports(source)).toEqual(["./setup.diagram.ts"]);
  });

  test("returns empty array for source with no imports", () => {
    expect(extractImports("const x = 1")).toEqual([]);
  });

  test("handles multiple imports on different lines", () => {
    const source = `
import { a } from "./a.diagram.ts";
import { b } from "./b.arch.ts";
import { c } from "./c.sequence.ts";
    `;
    expect(extractImports(source)).toEqual(["./a.diagram.ts", "./b.arch.ts", "./c.sequence.ts"]);
  });

  test("handles import with single quotes", () => {
    const source = `import { foo } from './foo.diagram.ts';`;
    expect(extractImports(source)).toEqual(["./foo.diagram.ts"]);
  });
});
