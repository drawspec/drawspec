<svelte:options
  customElement={{
    tag: "drawspec-diagram",
    props: {
      src: { type: "String", reflect: true },
      theme: { type: "String", reflect: true },
      interactive: { type: "Boolean", reflect: true },
      svg: { type: "String" },
      diagnostics: { type: "Array" },
      architecture: { type: "Object" },
    },
  }}
/>

<script lang="ts">
import type { ArchitectureRelationshipKind } from "@drawspec/architecture";
import type { Diagnostic } from "@drawspec/core";
import ElementList from "./explorer/ElementList.svelte";
import { createExplorerState, type ExplorerState } from "./explorer/state";
import { normalizeViewerPayload, renderDiagramSvg } from "./render";
import type {
  ArchitectureData,
  DrawspecTheme,
  SerializedElement,
  SerializedRelationship,
  SourceSelectDetail,
} from "./types";

let {
  src = "",
  theme = "light",
  interactive = true,
  svg = "",
  diagnostics = [],
  architecture = undefined,
} = $props<{
  src?: string;
  theme?: DrawspecTheme;
  interactive?: boolean;
  svg?: string;
  diagnostics?: Diagnostic[];
  architecture?: ArchitectureData;
}>();

let renderedSvg = $state("");
let activeDiagnostics = $state<Diagnostic[]>([]);
let scale = $state(1);
let translateX = $state(0);
let translateY = $state(0);
let isPanning = false;
let lastX = 0;
let lastY = 0;

let explorer = $state<ExplorerState | undefined>(undefined);
let searchInput = $state("");
let showDetailsPanel = $state(false);
let detailsPanelElement = $state<SerializedElement | undefined>(undefined);
let detailsIncoming = $state<readonly SerializedRelationship[]>([]);
let detailsOutgoing = $state<readonly SerializedRelationship[]>([]);
let showPerfOverlay = $state(false);
let perfFps = $state(0);
let perfElementCount = $state(0);
let perfRelCount = $state(0);
let perfLayoutMs = $state(0);
let perfRenderMs = $state(0);
let availableRelKinds = $state<ArchitectureRelationshipKind[]>([]);
let activeRelKinds = $state<Set<ArchitectureRelationshipKind>>(new Set());
let showExplorerBar = $state(false);
let showRelFilter = $state(false);
let showElementList = $state(false);
let canvasEl: HTMLDivElement | undefined = $state();

let visibleElements = $state<readonly SerializedElement[]>([]);

$effect(() => {
  if (!explorer) {
    visibleElements = [];
    return;
  }
  const searchResults = explorer.searchResults;
  const hiddenIds = explorer.hiddenElementIds;
  if (searchResults.length > 0) {
    visibleElements = searchResults.filter((el) => !hiddenIds.has(el.id));
  } else {
    visibleElements = explorer.data.elements.filter((el) => !hiddenIds.has(el.id));
  }
});

let frameCount = 0;
let lastFpsTime = 0;
let fpsAnimFrame = 0;

$effect(() => {
  if (src.length === 0) return;
  void loadSource(src, theme);
});

$effect(() => {
  renderedSvg = svg;
});

$effect(() => {
  activeDiagnostics = diagnostics;
});

$effect(() => {
  if (architecture && architecture.elements.length > 0) {
    explorer = createExplorerState(architecture);
    showExplorerBar = true;
    const kinds = new Set<ArchitectureRelationshipKind>();
    for (const rel of architecture.relationships) {
      kinds.add(rel.kind);
    }
    availableRelKinds = [...kinds];
    activeRelKinds = new Set(kinds);
    perfElementCount = architecture.elements.length;
    perfRelCount = architecture.relationships.length;
  } else {
    explorer = undefined;
    showExplorerBar = false;
  }
});

$effect(() => {
  if (showPerfOverlay) {
    startFpsCounter();
  }
  return () => stopFpsCounter();
});

function startFpsCounter() {
  lastFpsTime = performance.now();
  frameCount = 0;
  const tick = () => {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      perfFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
      frameCount = 0;
      lastFpsTime = now;
    }
    fpsAnimFrame = requestAnimationFrame(tick);
  };
  fpsAnimFrame = requestAnimationFrame(tick);
}

function stopFpsCounter() {
  if (fpsAnimFrame) cancelAnimationFrame(fpsAnimFrame);
}

async function loadSource(url: string, activeTheme: DrawspecTheme): Promise<void> {
  const startMs = performance.now();
  try {
    const response = await fetch(url);
    const payload = normalizeViewerPayload(await response.json());
    activeDiagnostics = payload.diagnostics ?? [];
    if (payload.architecture) {
      architecture = payload.architecture;
    }
    const layoutStart = performance.now();
    renderedSvg =
      payload.svg ??
      (payload.document === undefined ? "" : await renderDiagramSvg(payload.document, activeTheme));
    perfLayoutMs = Math.round(performance.now() - layoutStart);
    perfRenderMs = Math.round(performance.now() - startMs);
  } catch (error) {
    activeDiagnostics = [
      {
        code: "viewer/load",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function zoom(delta: number): void {
  scale = Math.min(4, Math.max(0.2, scale + delta));
}

function resetView(): void {
  scale = 1;
  translateX = 0;
  translateY = 0;
}

function onWheel(event: WheelEvent): void {
  if (!interactive) return;
  event.preventDefault();
  zoom(event.deltaY < 0 ? 0.1 : -0.1);
}

function startPan(event: PointerEvent): void {
  if (!interactive) return;
  isPanning = true;
  lastX = event.clientX;
  lastY = event.clientY;
}

function movePan(event: PointerEvent): void {
  if (!isPanning) return;
  translateX += event.clientX - lastX;
  translateY += event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
}

function onCanvasClick(event: MouseEvent): void {
  dispatchSourceSelect(event);
  if (!explorer) return;
  const target = event.target as HTMLElement;
  const svgElement = target.closest("[data-element-id]") as HTMLElement | null;
  if (svgElement) {
    const elementId = svgElement.dataset.elementId;
    if (elementId) {
      selectElementById(elementId);
      return;
    }
  }
  const groupElement = target.closest("[data-group-id]") as HTMLElement | null;
  if (groupElement) {
    const groupId = groupElement.dataset.groupId;
    if (groupId) {
      explorer.toggleGroupCollapsed(groupId);
      applyCollapsedState();
      return;
    }
  }
  deselectElement();
}

/**
 * Walk up from the click target to find the closest element with
 * `data-source-file` and `data-source-line` attributes. If found, dispatch
 * a `sourceselect` custom event that crosses the shadow DOM boundary from
 * the `<drawspec-diagram>` element.
 */
function dispatchSourceSelect(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const sourceEl = target.closest("[data-source-file]") as HTMLElement | null;
  if (sourceEl === null) return;

  const file = sourceEl.dataset.sourceFile;
  const lineAttr = sourceEl.dataset.sourceLine;
  if (file === undefined || lineAttr === undefined) return;

  const line = Math.max(1, Math.trunc(Number(lineAttr)));
  if (!Number.isFinite(line)) return;

  const detail: SourceSelectDetail = { file, line };
  const columnAttr = sourceEl.dataset.sourceColumn;
  if (columnAttr !== undefined) {
    const column = Math.max(1, Math.trunc(Number(columnAttr)));
    if (Number.isFinite(column)) {
      detail.column = column;
    }
  }

  const host = (canvasEl?.getRootNode() as ShadowRoot)?.host ?? canvasEl;
  host?.dispatchEvent(
    new CustomEvent<SourceSelectDetail>("sourceselect", {
      bubbles: true,
      composed: true,
      detail,
    })
  );
}

function applySearchFilter(): void {
  if (!explorer) return;
  explorer.setSearchQuery(searchInput);
  applyVisualFilters();
}

function applyVisualFilters(): void {
  if (!canvasEl) return;
  const svgRoot = canvasEl.querySelector("svg");
  if (!svgRoot) return;

  const highlightedIds = explorer?.highlightedElementIds ?? new Set();
  const hiddenIds = explorer?.hiddenElementIds ?? new Set();
  const visibleRels = explorer?.visibleRelationshipIds ?? new Set();
  const hasSearch = explorer?.searchQuery.length > 0;

  for (const node of svgRoot.querySelectorAll("[data-element-id]")) {
    const el = node as HTMLElement;
    const id = el.dataset.elementId ?? "";
    el.classList.toggle("ds-dimmed", hasSearch && !highlightedIds.has(id));
    el.classList.toggle("ds-hidden", hiddenIds.has(id));
    el.classList.toggle("ds-highlighted", highlightedIds.has(id));
  }

  for (const edge of svgRoot.querySelectorAll("[data-edge-id]")) {
    const el = edge as HTMLElement;
    const id = el.dataset.edgeId ?? "";
    el.classList.toggle("ds-dimmed", !visibleRels.has(id));
  }
}

function applyCollapsedState(): void {
  if (!canvasEl) return;
  const svgRoot = canvasEl.querySelector("svg");
  if (!svgRoot) return;
  const collapsed = explorer?.collapsedGroupIds ?? new Set();

  for (const group of svgRoot.querySelectorAll("[data-group-id]")) {
    const el = group as HTMLElement;
    const id = el.dataset.groupId ?? "";
    el.classList.toggle("ds-collapsed", collapsed.has(id));
  }

  const hiddenIds = explorer?.hiddenElementIds ?? new Set();
  for (const node of svgRoot.querySelectorAll("[data-element-id]")) {
    const el = node as HTMLElement;
    const id = el.dataset.elementId ?? "";
    el.classList.toggle("ds-hidden", hiddenIds.has(id));
  }
  applyVisualFilters();
}

function toggleRelKind(kind: ArchitectureRelationshipKind): void {
  if (!explorer) return;
  explorer.toggleRelationshipKind(kind);
  activeRelKinds = new Set(explorer.relationshipFilterKinds);
  applyVisualFilters();
}

function selectElementById(id: string): void {
  if (!explorer) return;
  explorer.selectElement(id);
  detailsPanelElement = explorer.selectedElement;
  detailsIncoming = explorer.selectedElementRelationships.incoming;
  detailsOutgoing = explorer.selectedElementRelationships.outgoing;
  showDetailsPanel = detailsPanelElement !== undefined;
}

function deselectElement(): void {
  if (!explorer) return;
  explorer.selectElement(undefined);
  detailsPanelElement = undefined;
  detailsIncoming = [];
  detailsOutgoing = [];
  showDetailsPanel = false;
}

function collapseAll(): void {
  if (!explorer) return;
  explorer.collapseAllGroups();
  applyCollapsedState();
}

function expandAll(): void {
  if (!explorer) return;
  explorer.expandAllGroups();
  applyCollapsedState();
}

function resetAllFilters(): void {
  if (!explorer) return;
  explorer.resetFilters();
  searchInput = "";
  activeRelKinds = new Set(explorer.relationshipFilterKinds);
  applyVisualFilters();
  applyCollapsedState();
}
</script>

<section class:dark={theme === "dark"} class="viewer" aria-label="DrawSpec diagram preview">
  {#if interactive}
    <div class="toolbar" aria-label="Zoom and pan controls">
      <div class="toolbar-group">
        <button type="button" on:click={() => zoom(0.2)}>+</button>
        <button type="button" on:click={() => zoom(-0.2)}>&minus;</button>
        <button type="button" on:click={resetView}>Reset</button>
      </div>
      {#if showExplorerBar}
        <div class="toolbar-group explorer-toolbar">
          <div class="search-wrapper">
            <input
              type="search"
              placeholder="Search elements..."
              bind:value={searchInput}
              on:input={applySearchFilter}
              aria-label="Search elements by name or tag"
            />
            {#if searchInput.length > 0}
              <span class="search-badge">{explorer?.searchResults.length ?? 0}</span>
            {/if}
          </div>
          <button type="button" class:active={showRelFilter} on:click={() => (showRelFilter = !showRelFilter)}>
            Filter
          </button>
          <button type="button" class:active={showElementList} on:click={() => (showElementList = !showElementList)}>
            List
          </button>
          <button type="button" on:click={expandAll}>Expand</button>
          <button type="button" on:click={collapseAll}>Collapse</button>
          <button type="button" class:active={showPerfOverlay} on:click={() => (showPerfOverlay = !showPerfOverlay)}>
            Perf
          </button>
          <button type="button" on:click={resetAllFilters}>Reset all</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if showRelFilter && explorer}
    <div class="rel-filter" aria-label="Relationship filter">
      {#each availableRelKinds as kind (kind)}
        <label class="filter-chip">
          <input
            type="checkbox"
            checked={activeRelKinds.has(kind)}
            on:change={() => toggleRelKind(kind)}
          />
          <span>{kind}</span>
        </label>
      {/each}
    </div>
  {/if}

  <div class="main-content">
    {#if showElementList && explorer}
      <aside class="element-list-panel" aria-label="Element list">
        <ElementList
          elements={visibleElements}
          highlightedIds={explorer.highlightedElementIds}
          hiddenIds={explorer.hiddenElementIds}
          selectedId={explorer.selectedElement?.id}
          onSelect={selectElementById}
        />
      </aside>
    {/if}

    <div
      class="canvas"
      bind:this={canvasEl}
      on:pointerdown={startPan}
      on:pointermove={movePan}
      on:pointerup={() => (isPanning = false)}
      on:pointerleave={() => (isPanning = false)}
      on:wheel={onWheel}
      on:click={onCanvasClick}
    >
      <div class="surface" style={`transform: translate(${translateX}px, ${translateY}px) scale(${scale});`}>
        {@html renderedSvg}
      </div>
    </div>
  </div>

  {#if showPerfOverlay}
    <div class="perf-overlay" aria-label="Performance metrics">
      <span>FPS: {perfFps}</span>
      <span>Elements: {perfElementCount}</span>
      <span>Relationships: {perfRelCount}</span>
      <span>Layout: {perfLayoutMs}ms</span>
      <span>Render: {perfRenderMs}ms</span>
    </div>
  {/if}

  {#if showDetailsPanel && detailsPanelElement}
    <aside class="details-panel" aria-label="Element details">
      <div class="details-header">
        <h3>{detailsPanelElement.name}</h3>
        <button type="button" class="close-btn" on:click={deselectElement} aria-label="Close details">&times;</button>
      </div>
      <div class="details-body">
        <dl>
          <dt>ID</dt>
          <dd>{detailsPanelElement.id}</dd>
          <dt>Kind</dt>
          <dd>{detailsPanelElement.kind}</dd>
          {#if detailsPanelElement.description}
            <dt>Description</dt>
            <dd>{detailsPanelElement.description}</dd>
          {/if}
          {#if detailsPanelElement.technology}
            <dt>Technology</dt>
            <dd>{detailsPanelElement.technology}</dd>
          {/if}
          {#if detailsPanelElement.owner}
            <dt>Owner</dt>
            <dd>{detailsPanelElement.owner}</dd>
          {/if}
          {#if detailsPanelElement.tags.length > 0}
            <dt>Tags</dt>
            <dd class="tags">{detailsPanelElement.tags.join(", ")}</dd>
          {/if}
          {#if detailsPanelElement.parentId}
            <dt>Parent</dt>
            <dd>{detailsPanelElement.parentId}</dd>
          {/if}
        </dl>
        {#if detailsOutgoing.length > 0}
          <h4>Outgoing relationships</h4>
          <ul>
            {#each detailsOutgoing as rel (rel.id)}
              <li><strong>{rel.label}</strong> &rarr; {rel.targetId}{#if rel.technology} <span class="tech">({rel.technology})</span>{/if}</li>
            {/each}
          </ul>
        {/if}
        {#if detailsIncoming.length > 0}
          <h4>Incoming relationships</h4>
          <ul>
            {#each detailsIncoming as rel (rel.id)}
              <li><strong>{rel.label}</strong> &larr; {rel.sourceId}{#if rel.technology} <span class="tech">({rel.technology})</span>{/if}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </aside>
  {/if}

  {#if activeDiagnostics.length > 0}
    <aside class="diagnostics" aria-label="Diagnostics">
      <h2>Diagnostics</h2>
      {#each activeDiagnostics as item}
        <p class={item.severity}><strong>{item.severity}</strong> {item.code}: {item.message}</p>
      {/each}
    </aside>
  {/if}
</section>

<style>
  :host { display: block; min-height: 24rem; }
  .viewer { position: relative; display: grid; grid-template-rows: auto auto 1fr auto auto; gap: .75rem; min-height: inherit; color: #0f172a; }
  .viewer.dark { color: #f8fafc; }
  .toolbar { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
  .toolbar-group { display: flex; gap: .5rem; }
  .explorer-toolbar { margin-left: auto; }
  button { border: 1px solid #94a3b8; border-radius: .5rem; background: #fff; color: #0f172a; padding: .4rem .65rem; cursor: pointer; font-size: .875rem; }
  button:hover { background: #f1f5f9; }
  button.active { background: #0f172a; color: #fff; border-color: #0f172a; }
  .dark button { background: #1e293b; color: #f8fafc; border-color: #475569; }
  .dark button:hover { background: #334155; }
  .dark button.active { background: #f8fafc; color: #0f172a; border-color: #f8fafc; }

  .search-wrapper { position: relative; display: flex; align-items: center; }
  .search-wrapper input { border: 1px solid #94a3b8; border-radius: .5rem; padding: .4rem .65rem; font-size: .875rem; background: #fff; color: #0f172a; width: 12rem; }
  .dark .search-wrapper input { background: #1e293b; color: #f8fafc; border-color: #475569; }
  .search-badge { position: absolute; right: .5rem; top: 50%; transform: translateY(-50%); background: #0f172a; color: #fff; font-size: .7rem; padding: .1rem .4rem; border-radius: .25rem; }
  .dark .search-badge { background: #f8fafc; color: #0f172a; }

  .rel-filter { display: flex; gap: .5rem; flex-wrap: wrap; padding: .5rem; background: #f1f5f9; border-radius: .5rem; }
  .dark .rel-filter { background: #1e293b; }
  .filter-chip { display: flex; align-items: center; gap: .35rem; cursor: pointer; font-size: .8rem; }
  .filter-chip input { margin: 0; }

  .main-content { display: flex; flex: 1; min-height: 0; gap: 0; }
  .element-list-panel { width: 16rem; min-width: 12rem; border: 1px solid #cbd5e1; border-radius: .75rem; background: #fff; overflow: hidden; flex-shrink: 0; }
  .dark .element-list-panel { background: #0f172a; border-color: #334155; }
  .canvas { overflow: hidden; border: 1px solid #cbd5e1; border-radius: .75rem; background: #f8fafc; min-height: 24rem; touch-action: none; flex: 1; }
  .dark .canvas { background: #020617; border-color: #334155; }
  .surface { transform-origin: 0 0; width: max-content; min-width: 100%; transition: transform 80ms ease; }

  .perf-overlay { position: absolute; top: .5rem; right: .5rem; background: rgba(15, 23, 42, .85); color: #f8fafc; padding: .5rem .75rem; border-radius: .5rem; font-size: .75rem; font-family: monospace; display: flex; gap: 1rem; z-index: 10; pointer-events: none; }

  .details-panel { position: absolute; top: 0; right: 0; bottom: 0; width: 20rem; background: #fff; border-left: 1px solid #e2e8f0; overflow-y: auto; z-index: 20; box-shadow: -.25rem 0 .75rem rgba(0, 0, 0, .08); animation: slide-in .2s ease; }
  .dark .details-panel { background: #1e293b; border-color: #334155; }
  @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .details-header { display: flex; justify-content: space-between; align-items: center; padding: .75rem; border-bottom: 1px solid #e2e8f0; }
  .dark .details-header { border-color: #334155; }
  .details-header h3 { margin: 0; font-size: 1rem; }
  .close-btn { border: none; background: none; font-size: 1.25rem; cursor: pointer; padding: .25rem .5rem; line-height: 1; }
  .details-body { padding: .75rem; font-size: .875rem; }
  .details-body dl { margin: 0; }
  .details-body dt { font-weight: 600; margin-top: .5rem; color: #64748b; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; }
  .dark .details-body dt { color: #94a3b8; }
  .details-body dd { margin: .15rem 0 0; }
  .details-body .tags { font-family: monospace; font-size: .8rem; }
  .details-body h4 { font-size: .85rem; margin: .75rem 0 .35rem; }
  .details-body ul { margin: 0; padding-left: 1rem; }
  .details-body li { margin: .2rem 0; }
  .tech { color: #64748b; font-size: .8rem; }
  .dark .tech { color: #94a3b8; }

  .diagnostics { border: 1px solid #f59e0b; border-radius: .75rem; background: #fffbeb; padding: .75rem; }
  .diagnostics h2 { margin: 0 0 .5rem; font-size: 1rem; }
  .diagnostics p { margin: .25rem 0; }
  .diagnostics .error { color: #991b1b; }
  .diagnostics .warning { color: #92400e; }

  :global([data-element-id].ds-dimmed) { opacity: 0.25; transition: opacity .2s ease; }
  :global([data-element-id].ds-highlighted) { filter: drop-shadow(0 0 4px rgba(59, 130, 246, .6)); }
  :global([data-element-id].ds-hidden) { display: none; }
  :global([data-edge-id].ds-dimmed) { opacity: 0.15; transition: opacity .2s ease; }
  :global([data-group-id].ds-collapsed [data-element-id]) { display: none; }
</style>
