// @ts-expect-error Bun provides bun:test at benchmark runtime; this repo does not install bun-types.
import { describe, test } from "bun:test";
import { createFilesystemCacheStore, generateCacheKey } from "../../../cache/src/index";
import type { DiagramDocument, DiagramEdge, DiagramNode } from "../../../core/src/index";
import { renderSvg } from "../../../renderer-svg/src/index";
import { sequenceLayout, simpleGraphLayout } from "../index";

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

function generateGraphNodes(count: number): DiagramNode[] {
  return Array.from({ length: count }, (_, nodeIndex) => ({
    id: `graph_node_${nodeIndex}`,
    kind: nodeIndex % 7 === 0 ? "database" : "service",
    label: `Graph node ${nodeIndex}`,
    metadata: { lane: nodeIndex % 10 },
  }));
}

function generateGraphEdges(count: number, nodeCount: number): DiagramEdge[] {
  return Array.from({ length: count }, (_, edgeIndex) => ({
    id: `graph_edge_${edgeIndex}`,
    kind: "depends-on",
    sourceId: `graph_node_${edgeIndex % nodeCount}`,
    targetId: `graph_node_${(edgeIndex * 7 + 1) % nodeCount}`,
    direction: "forward",
    label: `Edge ${edgeIndex}`,
  }));
}

function generateGraphDiagram(elementCount: number): DiagramDocument {
  const nodeCount = Math.max(1, Math.ceil(elementCount * 0.6));
  const edgeCount = Math.max(0, elementCount - nodeCount);
  return {
    schemaVersion: "1.0.0",
    id: `bench_graph_${elementCount}`,
    title: `Benchmark graph ${elementCount}`,
    kind: "graph",
    nodes: generateGraphNodes(nodeCount),
    edges: generateGraphEdges(edgeCount, nodeCount),
    groups: [],
    annotations: [],
    layout: { direction: "lr" },
    metadata: { elementCount },
  };
}

function generateSequenceDiagram(participants: number, messages: number): DiagramDocument {
  const nodes: DiagramNode[] = Array.from({ length: participants }, (_, participantIndex) => ({
    id: `participant_${participantIndex}`,
    kind: "participant",
    label: `Participant ${participantIndex}`,
  }));
  const edges: DiagramEdge[] = Array.from({ length: messages }, (_, messageIndex) => ({
    id: `message_${messageIndex}`,
    kind: messageIndex % 9 === 0 ? "return" : "message",
    sourceId: `participant_${messageIndex % participants}`,
    targetId: `participant_${(messageIndex + 1) % participants}`,
    direction: "forward",
    label: `Message ${messageIndex}`,
  }));
  return {
    schemaVersion: "1.0.0",
    id: `bench_sequence_${participants}_${messages}`,
    title: `Benchmark sequence ${participants}x${messages}`,
    kind: "sequence",
    nodes,
    edges,
    groups: [],
    annotations: [],
    metadata: { participants, messages },
  };
}

function updateOneNode(document: DiagramDocument): DiagramDocument {
  return {
    ...document,
    id: `${document.id}_watch_update`,
    nodes: document.nodes.map((node, index) =>
      index === 0 ? { ...node, label: `${node.label ?? node.id} updated` } : node
    ),
  };
}

const smallGraph = generateGraphDiagram(10);
const mediumGraph = generateGraphDiagram(100);
const thousandElementGraph = generateGraphDiagram(1000);
const tenThousandElementGraph = generateGraphDiagram(10000);
const largeSequence = generateSequenceDiagram(50, 500);
const graphEngine = simpleGraphLayout();
const sequenceEngine = sequenceLayout();
const mediumPositioned = await graphEngine.layout(mediumGraph);
const warmPreviewDocument = updateOneNode(mediumGraph);
const filesystemCache = createFilesystemCacheStore({
  cacheDir: "node_modules/.cache/drawspec-bench/layout",
});
const layoutCacheKey = generateCacheKey(JSON.stringify(mediumPositioned), { format: "layout" });

describe("@drawspec/layout layout and render benchmarks", () => {
  bench("layout: small graph 10 elements", async () => {
    await simpleGraphLayout().layout(smallGraph);
  });

  bench("layout: medium graph 100 elements", async () => {
    await simpleGraphLayout().layout(mediumGraph);
  });

  bench("layout: large graph 1000 elements", async () => {
    await simpleGraphLayout().layout(thousandElementGraph);
  });

  bench("layout: large graph 10000 elements", async () => {
    await simpleGraphLayout().layout(tenThousandElementGraph);
  });

  bench("layout: large sequence 50 participants / 500 messages", async () => {
    await sequenceEngine.layout(largeSequence);
  });

  bench("render: cold medium graph to SVG", async () => {
    const positionedDiagram = await simpleGraphLayout().layout(mediumGraph);
    await renderSvg(mediumGraph, { positionedDiagram });
  });

  bench("render: warm medium graph to SVG", async () => {
    await renderSvg(mediumGraph, { positionedDiagram: mediumPositioned });
  });

  bench("watch: update one medium graph node", async () => {
    const positionedDiagram = await graphEngine.layout(warmPreviewDocument);
    await renderSvg(warmPreviewDocument, { positionedDiagram });
  });

  bench("cache: filesystem layout hit", async () => {
    await filesystemCache.set(layoutCacheKey, mediumPositioned);
    await filesystemCache.get(layoutCacheKey);
  });

  bench("cache: filesystem layout miss", async () => {
    await filesystemCache.get("ds_missing_layout_benchmark");
  });
});
