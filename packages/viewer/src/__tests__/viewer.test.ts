import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { createBrowserQuery } from "../explorer/query-adapter";
import { createExplorerState } from "../explorer/state";
import type {
  ArchitectureData,
  SerializedElement,
  SerializedRelationship,
} from "../explorer/types";
import { normalizeViewerPayload, renderDiagramSvg } from "../index";

const document: DiagramDocument = {
  schemaVersion: "1.0",
  id: "viewer-test",
  title: "Viewer Test",
  kind: "graph",
  nodes: [
    { id: "client", kind: "person", label: "Client" },
    { id: "api", kind: "system", label: "API" },
  ],
  edges: [{ id: "client-api", kind: "uses", sourceId: "client", targetId: "api", label: "calls" }],
  groups: [],
  annotations: [],
};

const testElements: SerializedElement[] = [
  {
    id: "user",
    kind: "person",
    name: "Web User",
    description: "End user",
    tags: ["external"],
    properties: {},
    childIds: [],
  },
  {
    id: "webapp",
    kind: "container",
    name: "Web Application",
    description: "Frontend SPA",
    technology: "React",
    tags: ["frontend"],
    properties: {},
    parentId: "system",
    childIds: [],
  },
  {
    id: "api",
    kind: "container",
    name: "API Server",
    description: "REST API",
    technology: "Node.js",
    tags: ["backend"],
    properties: {},
    parentId: "system",
    childIds: [],
  },
  {
    id: "db",
    kind: "database",
    name: "PostgreSQL",
    description: "Primary database",
    technology: "PostgreSQL 15",
    tags: ["persistence"],
    properties: {},
    parentId: "system",
    childIds: [],
  },
  {
    id: "system",
    kind: "softwareSystem",
    name: "Main System",
    tags: ["internal"],
    properties: {},
    childIds: ["webapp", "api", "db"],
  },
];

const testRelationships: SerializedRelationship[] = [
  {
    id: "user-webapp",
    kind: "uses",
    sourceId: "user",
    targetId: "webapp",
    label: "Opens",
    direction: "forward",
    tags: ["https"],
  },
  {
    id: "webapp-api",
    kind: "uses",
    sourceId: "webapp",
    targetId: "api",
    label: "Calls",
    description: "REST calls",
    technology: "HTTP/JSON",
    direction: "forward",
    tags: ["rest"],
  },
  {
    id: "api-db",
    kind: "uses",
    sourceId: "api",
    targetId: "db",
    label: "Reads/Writes",
    technology: "SQL/TCP",
    direction: "forward",
    tags: ["sql"],
  },
];

const testData: ArchitectureData = { elements: testElements, relationships: testRelationships };

describe("@drawspec/viewer — existing functionality", () => {
  test("renders mock IR data to SVG", async () => {
    const svg = await renderDiagramSvg(document);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Viewer Test");
    expect(svg).toContain("Client");
  });

  test("normalizes diagram payloads", () => {
    const payload = normalizeViewerPayload({ document, diagnostics: [] });
    expect(payload.document?.id).toBe("viewer-test");
    expect(payload.diagnostics).toEqual([]);
  });

  test("normalizes payload with architecture data", () => {
    const payload = normalizeViewerPayload({ document, architecture: testData });
    expect(payload.document?.id).toBe("viewer-test");
    expect(payload.architecture?.elements.length).toBe(5);
    expect(payload.architecture?.relationships.length).toBe(3);
  });

  test("normalizes payload without architecture data", () => {
    const payload = normalizeViewerPayload({ svg: "<svg></svg>" });
    expect(payload.svg).toBe("<svg></svg>");
    expect(payload.architecture).toBeUndefined();
  });

  test("rejects invalid architecture data", () => {
    const payload = normalizeViewerPayload({ architecture: { elements: "not-array" } });
    expect(payload.architecture).toBeUndefined();
  });

  test("rejects non-object payloads", () => {
    const payload = normalizeViewerPayload("not an object");
    expect(payload.diagnostics.length).toBe(1);
    expect(payload.diagnostics[0].code).toBe("viewer/payload");
  });

  test("accepts DiagramDocument as direct payload", () => {
    const payload = normalizeViewerPayload(document);
    expect(payload.document?.id).toBe("viewer-test");
  });
});

describe("query-adapter — element queries", () => {
  const query = createBrowserQuery(testData);

  test("returns all elements without filter", () => {
    expect(query.elements().length).toBe(5);
  });

  test("filters elements by kind", () => {
    const persons = query.elements({ kind: "person" });
    expect(persons.length).toBe(1);
    expect(persons[0].id).toBe("user");
  });

  test("filters elements by tag", () => {
    const frontend = query.elements({ tags: ["frontend"] });
    expect(frontend.length).toBe(1);
    expect(frontend[0].id).toBe("webapp");
  });

  test("filters elements by negated tag", () => {
    const nonExternal = query.elements({ tags: ["!external"] });
    expect(nonExternal.length).toBe(4);
    expect(nonExternal.every((e) => e.id !== "user")).toBe(true);
  });

  test("filters elements by parentId", () => {
    const children = query.elements({ parentId: "system" });
    expect(children.length).toBe(3);
    expect(children.every((e) => e.parentId === "system")).toBe(true);
  });

  test("filters elements by name query", () => {
    const results = query.elements({ nameQuery: "Postgre" });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("db");
  });

  test("combines multiple filters", () => {
    const results = query.elements({ kind: "container", parentId: "system" });
    expect(results.length).toBe(2);
  });

  test("returns empty for non-matching filter", () => {
    expect(query.elements({ kind: "person", parentId: "system" }).length).toBe(0);
  });
});

describe("query-adapter — relationship queries", () => {
  const query = createBrowserQuery(testData);

  test("returns all relationships without filter", () => {
    expect(query.relationships().length).toBe(3);
  });

  test("filters relationships by sourceId", () => {
    const fromUser = query.relationships({ sourceId: "user" });
    expect(fromUser.length).toBe(1);
    expect(fromUser[0].targetId).toBe("webapp");
  });

  test("filters relationships by targetId", () => {
    const toApi = query.relationships({ targetId: "api" });
    expect(toApi.length).toBe(1);
    expect(toApi[0].sourceId).toBe("webapp");
  });

  test("filters relationships by kind", () => {
    const uses = query.relationships({ kind: "uses" });
    expect(uses.length).toBe(3);
  });

  test("filters relationships by tag", () => {
    const sqlRels = query.relationships({ tags: ["sql"] });
    expect(sqlRels.length).toBe(1);
    expect(sqlRels[0].id).toBe("api-db");
  });

  test("returns empty for non-matching filter", () => {
    expect(query.relationships({ sourceId: "db" }).length).toBe(0);
  });
});

describe("query-adapter — path queries", () => {
  const query = createBrowserQuery(testData);

  test("finds direct path", () => {
    const result = query.path("user", "webapp");
    expect(result.found).toBe(true);
    expect(result.elements.length).toBe(2);
    expect(result.relationships.length).toBe(1);
  });

  test("finds multi-hop path", () => {
    const result = query.path("user", "db");
    expect(result.found).toBe(true);
    expect(result.elements.length).toBe(4);
    expect(result.relationships.length).toBe(3);
  });

  test("returns same element path", () => {
    const result = query.path("user", "user");
    expect(result.found).toBe(true);
    expect(result.elements.length).toBe(1);
    expect(result.relationships.length).toBe(0);
  });

  test("returns not found for disconnected nodes", () => {
    const isolatedData: ArchitectureData = {
      elements: [
        { id: "a", kind: "person", name: "A", tags: [], properties: {}, childIds: [] },
        { id: "b", kind: "person", name: "B", tags: [], properties: {}, childIds: [] },
      ],
      relationships: [],
    };
    const q = createBrowserQuery(isolatedData);
    const result = q.path("a", "b");
    expect(result.found).toBe(false);
  });

  test("respects maxDepth", () => {
    const result = query.path("user", "db", { maxDepth: 1 });
    expect(result.found).toBe(false);
  });

  test("supports reverse direction", () => {
    const result = query.path("db", "user", { direction: "reverse" });
    expect(result.found).toBe(true);
    expect(result.elements[0].id).toBe("db");
    expect(result.elements[result.elements.length - 1].id).toBe("user");
  });

  test("supports both direction", () => {
    const result = query.path("db", "user", { direction: "both" });
    expect(result.found).toBe(true);
  });
});

describe("query-adapter — search", () => {
  const query = createBrowserQuery(testData);

  test("searches by name", () => {
    const results = query.search("API");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("api");
  });

  test("searches case-insensitively", () => {
    const results = query.search("postgre");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("db");
  });

  test("searches by description", () => {
    const results = query.search("Primary database");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("db");
  });

  test("searches by tag", () => {
    const results = query.search("persistence");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("db");
  });

  test("returns empty for empty query", () => {
    expect(query.search("").length).toBe(0);
  });

  test("returns empty for whitespace query", () => {
    expect(query.search("   ").length).toBe(0);
  });

  test("supports multi-word search", () => {
    const results = query.search("Web Application");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("webapp");
  });

  test("respects maxResults", () => {
    const results = query.search("a", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test("partial name match", () => {
    const results = query.search("Post");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("db");
  });
});

describe("explorer state", () => {
  test("initializes with correct defaults", () => {
    const state = createExplorerState(testData);
    expect(state.data).toBe(testData);
    expect(state.searchQuery).toBe("");
    expect(state.searchResults.length).toBe(0);
    expect(state.collapsedGroupIds.size).toBe(0);
    expect(state.hiddenElementIds.size).toBe(0);
    expect(state.selectedElement).toBeUndefined();
    expect(state.showPerfOverlay).toBe(false);
    expect(state.perfMetrics.elementCount).toBe(5);
    expect(state.perfMetrics.relationshipCount).toBe(3);
  });

  test("setSearchQuery finds elements", () => {
    const state = createExplorerState(testData);
    state.setSearchQuery("Postgre");
    expect(state.searchResults.length).toBe(1);
    expect(state.searchResults[0].id).toBe("db");
    expect(state.highlightedElementIds.has("db")).toBe(true);
  });

  test("setSearchQuery clears on empty", () => {
    const state = createExplorerState(testData);
    state.setSearchQuery("Postgre");
    expect(state.searchResults.length).toBe(1);
    state.setSearchQuery("");
    expect(state.searchResults.length).toBe(0);
    expect(state.highlightedElementIds.size).toBe(0);
  });

  test("toggleRelationshipKind filters relationships", () => {
    const state = createExplorerState(testData);
    state.toggleRelationshipKind("uses");
    expect(state.relationshipFilterKinds.size).toBe(0);
    expect(state.filteredRelationships.length).toBe(0);
    expect(state.visibleRelationshipIds.size).toBe(0);
  });

  test("toggleRelationshipKind re-enables kind", () => {
    const state = createExplorerState(testData);
    state.toggleRelationshipKind("uses");
    expect(state.relationshipFilterKinds.has("uses")).toBe(false);
    state.toggleRelationshipKind("uses");
    expect(state.relationshipFilterKinds.has("uses")).toBe(true);
    expect(state.filteredRelationships.length).toBe(3);
  });

  test("toggleGroupCollapsed hides children", () => {
    const state = createExplorerState(testData);
    state.toggleGroupCollapsed("system");
    expect(state.collapsedGroupIds.has("system")).toBe(true);
    expect(state.hiddenElementIds.has("webapp")).toBe(true);
    expect(state.hiddenElementIds.has("api")).toBe(true);
    expect(state.hiddenElementIds.has("db")).toBe(true);
  });

  test("toggleGroupCollapsed re-expands group", () => {
    const state = createExplorerState(testData);
    state.toggleGroupCollapsed("system");
    state.toggleGroupCollapsed("system");
    expect(state.collapsedGroupIds.has("system")).toBe(false);
    expect(state.hiddenElementIds.size).toBe(0);
  });

  test("collapseAllGroups collapses all groups", () => {
    const state = createExplorerState(testData);
    state.collapseAllGroups();
    expect(state.collapsedGroupIds.has("system")).toBe(true);
    expect(state.hiddenElementIds.size).toBe(3);
  });

  test("expandAllGroups expands all groups", () => {
    const state = createExplorerState(testData);
    state.collapseAllGroups();
    state.expandAllGroups();
    expect(state.collapsedGroupIds.size).toBe(0);
    expect(state.hiddenElementIds.size).toBe(0);
  });

  test("selectElement shows details", () => {
    const state = createExplorerState(testData);
    state.selectElement("api");
    expect(state.selectedElement?.id).toBe("api");
    expect(state.selectedElement?.name).toBe("API Server");
    expect(state.selectedElementRelationships.incoming.length).toBe(1);
    expect(state.selectedElementRelationships.outgoing.length).toBe(1);
  });

  test("selectElement with undefined clears selection", () => {
    const state = createExplorerState(testData);
    state.selectElement("api");
    state.selectElement(undefined);
    expect(state.selectedElement).toBeUndefined();
    expect(state.selectedElementRelationships.incoming.length).toBe(0);
    expect(state.selectedElementRelationships.outgoing.length).toBe(0);
  });

  test("selectElement with unknown id clears selection", () => {
    const state = createExplorerState(testData);
    state.selectElement("nonexistent");
    expect(state.selectedElement).toBeUndefined();
  });

  test("togglePerfOverlay toggles state", () => {
    const state = createExplorerState(testData);
    expect(state.showPerfOverlay).toBe(false);
    state.togglePerfOverlay();
    expect(state.showPerfOverlay).toBe(true);
    state.togglePerfOverlay();
    expect(state.showPerfOverlay).toBe(false);
  });

  test("updatePerfMetrics updates metrics", () => {
    const state = createExplorerState(testData);
    state.updatePerfMetrics({ fps: 60, layoutTimeMs: 42 });
    expect(state.perfMetrics.fps).toBe(60);
    expect(state.perfMetrics.layoutTimeMs).toBe(42);
    expect(state.perfMetrics.elementCount).toBe(5);
  });

  test("resetFilters restores defaults", () => {
    const state = createExplorerState(testData);
    state.setSearchQuery("test");
    state.toggleRelationshipKind("uses");
    state.toggleGroupCollapsed("system");
    state.resetFilters();
    expect(state.searchQuery).toBe("");
    expect(state.searchResults.length).toBe(0);
    expect(state.highlightedElementIds.size).toBe(0);
    expect(state.relationshipFilterKinds.has("uses")).toBe(true);
    expect(state.collapsedGroupIds.size).toBe(0);
    expect(state.hiddenElementIds.size).toBe(0);
    expect(state.filteredRelationships.length).toBe(3);
  });

  test("query delegate works through state", () => {
    const state = createExplorerState(testData);
    const results = state.query.search("API");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("api");
  });
});

describe("explorer state — nested groups", () => {
  const nestedData: ArchitectureData = {
    elements: [
      {
        id: "root",
        kind: "softwareSystem",
        name: "Root",
        tags: [],
        properties: {},
        childIds: ["mid"],
      },
      {
        id: "mid",
        kind: "container",
        name: "Mid",
        tags: [],
        properties: {},
        parentId: "root",
        childIds: ["leaf"],
      },
      {
        id: "leaf",
        kind: "container",
        name: "Leaf",
        tags: [],
        properties: {},
        parentId: "mid",
        childIds: [],
      },
    ],
    relationships: [],
  };

  test("collapsing parent hides all descendants", () => {
    const state = createExplorerState(nestedData);
    state.toggleGroupCollapsed("root");
    expect(state.hiddenElementIds.has("mid")).toBe(true);
    expect(state.hiddenElementIds.has("leaf")).toBe(true);
  });

  test("collapsing mid hides leaf but not root", () => {
    const state = createExplorerState(nestedData);
    state.toggleGroupCollapsed("mid");
    expect(state.hiddenElementIds.has("leaf")).toBe(true);
    expect(state.hiddenElementIds.has("root")).toBe(false);
    expect(state.hiddenElementIds.has("mid")).toBe(false);
  });
});

describe("explorer state — empty data", () => {
  const emptyData: ArchitectureData = { elements: [], relationships: [] };

  test("handles empty data gracefully", () => {
    const state = createExplorerState(emptyData);
    expect(state.data.elements.length).toBe(0);
    expect(state.data.relationships.length).toBe(0);
    expect(state.query.elements().length).toBe(0);
    expect(state.query.relationships().length).toBe(0);
    expect(state.query.search("anything").length).toBe(0);
  });

  test("selectElement on empty data returns undefined", () => {
    const state = createExplorerState(emptyData);
    state.selectElement("nothing");
    expect(state.selectedElement).toBeUndefined();
  });
});
