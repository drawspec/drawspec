// @ts-expect-error Bun provides bun:test at benchmark runtime; this repo does not install bun-types.
import { describe, test } from "bun:test";
import { createFilesystemCacheStore, generateCacheKey } from "../../../cache/src/index";
import type { DiagramDocument, DiagramEdge, DiagramNode } from "../index";
import { serializeDocument } from "../index";

interface CompileResult {
  readonly key: string;
  readonly value: string;
}

function bench(name: string, callback: () => void | Promise<void>): void {
  test(name, async () => {
    console.time(name);
    try {
      await callback();
    } finally {
      console.timeEnd(name);
    }
  });
}

function generateNodes(diagramIndex: number, count: number): DiagramNode[] {
  return Array.from({ length: count }, (_, nodeIndex) => ({
    id: `diagram_${diagramIndex}_node_${nodeIndex}`,
    kind: nodeIndex % 5 === 0 ? "database" : "service",
    label: `Node ${diagramIndex}.${nodeIndex}`,
    metadata: { ordinal: nodeIndex, shard: nodeIndex % 8 },
  }));
}

function generateEdges(diagramIndex: number, count: number, nodeCount: number): DiagramEdge[] {
  return Array.from({ length: count }, (_, edgeIndex) => ({
    id: `diagram_${diagramIndex}_edge_${edgeIndex}`,
    kind: "calls",
    sourceId: `diagram_${diagramIndex}_node_${edgeIndex % nodeCount}`,
    targetId: `diagram_${diagramIndex}_node_${(edgeIndex + 1) % nodeCount}`,
    direction: "forward",
    label: `Call ${edgeIndex}`,
  }));
}

export function generateDiagrams(count: number, elementCount: number): DiagramDocument[] {
  return Array.from({ length: count }, (_, diagramIndex) => {
    const nodeCount = Math.max(1, Math.ceil(elementCount * 0.6));
    const edgeCount = Math.max(0, elementCount - nodeCount);
    return {
      schemaVersion: "1.0.0",
      id: `bench_compile_${diagramIndex}_${elementCount}`,
      title: `Benchmark compile ${diagramIndex}`,
      kind: "architecture",
      nodes: generateNodes(diagramIndex, nodeCount),
      edges: generateEdges(diagramIndex, edgeCount, nodeCount),
      groups: [],
      annotations: [],
      metadata: { scale: elementCount, diagramIndex },
    };
  });
}

function compileDocuments(documents: readonly DiagramDocument[]): CompileResult[] {
  return documents.map((document) => {
    const value = serializeDocument(document);
    return { key: generateCacheKey(value, { format: "ir" }), value };
  });
}

function compileWithMemoryCache(
  documents: readonly DiagramDocument[],
  cache: Map<string, string>
): CompileResult[] {
  return documents.map((document) => {
    const value = serializeDocument(document);
    const key = generateCacheKey(value, { format: "ir" });
    const cached = cache.get(key);
    if (cached !== undefined) {
      return { key, value: cached };
    }
    cache.set(key, value);
    return { key, value };
  });
}

const smallDiagrams = generateDiagrams(1, 10);
const mediumDiagrams = generateDiagrams(10, 100);
const largeDiagrams = generateDiagrams(100, 100);
const thousandTinyDiagrams = generateDiagrams(1000, 10);
const thousandElementDiagram = generateDiagrams(1, 1000);
const tenThousandElementSet = generateDiagrams(100, 100);
const warmCompileCache = new Map(
  compileDocuments(mediumDiagrams).map((result) => [result.key, result.value])
);
const filesystemCache = createFilesystemCacheStore({
  cacheDir: "node_modules/.cache/drawspec-bench/core",
});
const filesystemPayload = compileDocuments(smallDiagrams)[0];

describe("@drawspec/core compile benchmarks", () => {
  bench("compile: small 1 diagram / 10 elements", () => {
    compileDocuments(smallDiagrams);
  });

  bench("compile: cold 10 diagrams / 100 elements each", () => {
    compileWithMemoryCache(mediumDiagrams, new Map());
  });

  bench("compile: warm 10 diagrams / 100 elements each", () => {
    compileWithMemoryCache(mediumDiagrams, warmCompileCache);
  });

  bench("compile: large 100 diagrams / 100 elements each", () => {
    compileDocuments(largeDiagrams);
  });

  bench("compile: 1000 tiny diagrams", () => {
    compileDocuments(thousandTinyDiagrams);
  });

  bench("compile: single 1000-element diagram", () => {
    compileDocuments(thousandElementDiagram);
  });

  bench("compile: 10000 total elements", () => {
    compileDocuments(tenThousandElementSet);
  });

  bench("cache: filesystem hit", async () => {
    await filesystemCache.set(filesystemPayload.key, filesystemPayload.value);
    await filesystemCache.get(filesystemPayload.key);
  });

  bench("cache: filesystem miss", async () => {
    await filesystemCache.get("ds_missing_compile_benchmark");
  });
});
