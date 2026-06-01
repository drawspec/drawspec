import { describe, test } from "bun:test";
import { createBrowserQuery } from "../explorer/query-adapter";
import { createExplorerState } from "../explorer/state";
import type {
  ArchitectureData,
  SerializedElement,
  SerializedRelationship,
} from "../explorer/types";

declare const Bun: {
  env: { readonly DRAWSPEC_RUN_BENCH?: string };
};

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

const C4_KINDS: readonly SerializedElement["kind"][] = [
  "person",
  "softwareSystem",
  "container",
  "database",
];

function generateElements(count: number): SerializedElement[] {
  const elements: SerializedElement[] = [];
  const groupCount = Math.floor(count / 10);
  for (let i = 0; i < groupCount; i++) {
    const childIds: string[] = [];
    for (let j = 0; j < 9; j++) {
      const childIdx = groupCount + i * 9 + j;
      if (childIdx < count) {
        childIds.push(`element_${childIdx}`);
      }
    }
    elements.push({
      id: `element_${i}`,
      kind: "softwareSystem",
      name: `System ${i}`,
      description: `Software system ${i} for benchmark`,
      technology: "TypeScript",
      tags: ["group", `group-${i % 5}`],
      properties: {},
      childIds,
    });
  }
  for (let i = groupCount; i < count; i++) {
    const groupIdx = i % groupCount;
    elements.push({
      id: `element_${i}`,
      kind: C4_KINDS[i % C4_KINDS.length] ?? "container",
      name: `Element ${i}`,
      description: `Architecture element ${i}`,
      technology: i % 3 === 0 ? "React" : i % 3 === 1 ? "Node.js" : "PostgreSQL",
      tags: [`tag-${i % 20}`, `tier-${i % 4}`],
      properties: {},
      parentId: `element_${groupIdx}`,
      childIds: [],
    });
  }
  return elements;
}

function generateRelationships(
  elements: readonly SerializedElement[],
  count: number
): SerializedRelationship[] {
  const leafElements = elements.filter((el) => el.childIds.length === 0);
  const relationships: SerializedRelationship[] = [];
  for (let i = 0; i < count; i++) {
    const sourceIdx = i % leafElements.length;
    const targetIdx = (i + 1) % leafElements.length;
    const source = leafElements[sourceIdx];
    const target = leafElements[targetIdx];
    if (source !== undefined && target !== undefined) {
      relationships.push({
        id: `rel_${i}`,
        kind: "uses",
        sourceId: source.id,
        targetId: target.id,
        label: `Uses ${i}`,
        direction: "forward",
        tags: [`rel-tag-${i % 10}`],
      });
    }
  }
  return relationships;
}

function generateLargeWorkspace(elementCount: number): ArchitectureData {
  const elements = generateElements(elementCount);
  const relationshipCount = Math.floor(elementCount * 1.5);
  const relationships = generateRelationships(elements, relationshipCount);
  return { elements, relationships };
}

const data1k = generateLargeWorkspace(1_000);
const data5k = generateLargeWorkspace(5_000);
const data10k = generateLargeWorkspace(10_000);

describe("@drawspec/viewer scale benchmarks", () => {
  bench("explorer state init: 1k elements", () => {
    createExplorerState(data1k);
  });

  bench("explorer state init: 10k elements", () => {
    createExplorerState(data10k);
  });

  bench("search: 1k elements", () => {
    const query = createBrowserQuery(data1k);
    query.search("Element 500");
  });

  bench("search: 10k elements", () => {
    const query = createBrowserQuery(data10k);
    query.search("Element 5000");
  });

  bench("filter by tag: 1k elements", () => {
    const query = createBrowserQuery(data1k);
    query.elements({ tags: ["tag-5"] });
  });

  bench("filter by tag: 10k elements", () => {
    const query = createBrowserQuery(data10k);
    query.elements({ tags: ["tag-5"] });
  });

  bench("state search + collapse + select: 1k elements", () => {
    const state = createExplorerState(data1k);
    state.setSearchQuery("Element 500");
    state.toggleGroupCollapsed("element_0");
    state.selectElement("element_500");
  });

  bench("state search + collapse + select: 5k elements", () => {
    const state = createExplorerState(data5k);
    state.setSearchQuery("Element 2500");
    state.toggleGroupCollapsed("element_0");
    state.selectElement("element_2500");
  });

  bench("state search + collapse + select: 10k elements", () => {
    const state = createExplorerState(data10k);
    state.setSearchQuery("Element 5000");
    state.toggleGroupCollapsed("element_0");
    state.selectElement("element_5000");
  });

  bench("path query: 1k elements", () => {
    const query = createBrowserQuery(data1k);
    query.path("element_100", "element_900");
  });

  bench("path query: 5k elements", () => {
    const query = createBrowserQuery(data5k);
    query.path("element_500", "element_4500");
  });
});
