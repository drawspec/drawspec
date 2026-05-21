import type { ArchitectureRelationshipKind } from "@drawspec/architecture";
import { type BrowserQuery, createBrowserQuery } from "./query-adapter";
import type {
  ArchitectureData,
  PerformanceMetrics,
  SerializedElement,
  SerializedRelationship,
} from "./types";

export interface ExplorerState {
  readonly data: ArchitectureData;
  readonly query: BrowserQuery;

  searchQuery: string;
  searchResults: readonly SerializedElement[];
  highlightedElementIds: ReadonlySet<string>;

  relationshipFilterKinds: ReadonlySet<ArchitectureRelationshipKind>;
  filteredRelationships: readonly SerializedRelationship[];
  visibleRelationshipIds: ReadonlySet<string>;

  collapsedGroupIds: ReadonlySet<string>;
  hiddenElementIds: ReadonlySet<string>;

  selectedElement: SerializedElement | undefined;
  selectedElementRelationships: {
    incoming: readonly SerializedRelationship[];
    outgoing: readonly SerializedRelationship[];
  };

  showPerfOverlay: boolean;
  perfMetrics: PerformanceMetrics;

  setSearchQuery(query: string): void;
  toggleRelationshipKind(kind: ArchitectureRelationshipKind): void;
  toggleGroupCollapsed(elementId: string): void;
  expandAllGroups(): void;
  collapseAllGroups(): void;
  selectElement(elementId: string | undefined): void;
  togglePerfOverlay(): void;
  updatePerfMetrics(metrics: Partial<PerformanceMetrics>): void;
  resetFilters(): void;
}

export function createExplorerState(data: ArchitectureData): ExplorerState {
  const query = createBrowserQuery(data);

  const elementsById = new Map<string, SerializedElement>();
  for (const el of data.elements) {
    elementsById.set(el.id, el);
  }

  const allGroupIds = new Set(
    data.elements.filter((el) => el.childIds.length > 0).map((el) => el.id)
  );

  const allKinds = new Set<ArchitectureRelationshipKind>();
  for (const rel of data.relationships) {
    allKinds.add(rel.kind);
  }

  const state: ExplorerState = {
    data,
    query,

    searchQuery: "",
    searchResults: [],
    highlightedElementIds: new Set(),

    relationshipFilterKinds: allKinds,
    filteredRelationships: data.relationships,
    visibleRelationshipIds: new Set(data.relationships.map((r) => r.id)),

    collapsedGroupIds: new Set(),
    hiddenElementIds: new Set(),

    selectedElement: undefined,
    selectedElementRelationships: { incoming: [], outgoing: [] },

    showPerfOverlay: false,
    perfMetrics: {
      fps: 0,
      elementCount: data.elements.length,
      relationshipCount: data.relationships.length,
      layoutTimeMs: 0,
      renderTimeMs: 0,
      lastFrameTime: 0,
    },

    setSearchQuery(query: string) {
      state.searchQuery = query;
      if (query.trim().length === 0) {
        state.searchResults = [];
        state.highlightedElementIds = new Set();
        return;
      }
      state.searchResults = state.query.search(query);
      state.highlightedElementIds = new Set(state.searchResults.map((el) => el.id));
    },

    toggleRelationshipKind(kind: ArchitectureRelationshipKind) {
      const next = new Set(state.relationshipFilterKinds);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      state.relationshipFilterKinds = next;
      recomputeRelationships();
    },

    toggleGroupCollapsed(elementId: string) {
      const el = elementsById.get(elementId);
      if (!el || el.childIds.length === 0) return;

      const next = new Set(state.collapsedGroupIds);
      if (next.has(elementId)) {
        next.delete(elementId);
      } else {
        next.add(elementId);
      }
      state.collapsedGroupIds = next;
      recomputeHidden();
    },

    expandAllGroups() {
      state.collapsedGroupIds = new Set();
      recomputeHidden();
    },

    collapseAllGroups() {
      state.collapsedGroupIds = new Set(allGroupIds);
      recomputeHidden();
    },

    selectElement(elementId: string | undefined) {
      if (elementId === undefined) {
        state.selectedElement = undefined;
        state.selectedElementRelationships = { incoming: [], outgoing: [] };
        return;
      }
      const el = elementsById.get(elementId);
      if (!el) {
        state.selectedElement = undefined;
        state.selectedElementRelationships = { incoming: [], outgoing: [] };
        return;
      }
      state.selectedElement = el;
      state.selectedElementRelationships = {
        incoming: data.relationships.filter((r) => r.targetId === elementId),
        outgoing: data.relationships.filter((r) => r.sourceId === elementId),
      };
    },

    togglePerfOverlay() {
      state.showPerfOverlay = !state.showPerfOverlay;
    },

    updatePerfMetrics(metrics: Partial<PerformanceMetrics>) {
      Object.assign(state.perfMetrics, metrics);
    },

    resetFilters() {
      state.searchQuery = "";
      state.searchResults = [];
      state.highlightedElementIds = new Set();
      state.relationshipFilterKinds = allKinds;
      state.collapsedGroupIds = new Set();
      state.hiddenElementIds = new Set();
      recomputeRelationships();
    },
  };

  function recomputeRelationships() {
    const kinds = state.relationshipFilterKinds;
    state.filteredRelationships = data.relationships.filter((r) => kinds.has(r.kind));
    state.visibleRelationshipIds = new Set(state.filteredRelationships.map((r) => r.id));
  }

  function recomputeHidden() {
    const hidden = new Set<string>();
    for (const groupId of state.collapsedGroupIds) {
      collectDescendants(groupId, hidden);
    }
    state.hiddenElementIds = hidden;
  }

  function collectDescendants(elementId: string, into: Set<string>) {
    const el = elementsById.get(elementId);
    if (!el) return;
    for (const childId of el.childIds) {
      into.add(childId);
      collectDescendants(childId, into);
    }
  }

  return state;
}
