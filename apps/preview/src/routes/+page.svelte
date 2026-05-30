<script lang="ts">
import {
  currentSvg,
  diagnostics as diagnosticsStore,
  diagrams,
  selectedId,
  theme,
} from "$lib/stores/diagram";

// Web component props not available in TS types
interface ViewerElement extends HTMLElement {
  svg: string;
  theme: string;
  diagnostics: unknown[];
}

let sidebarCollapsed = $state(false);
let showDiagnostics = $state(false);
let viewerEl: ViewerElement | undefined = $state();

function selectDiagram(id: string) {
  selectedId.set(id);
  const list = $diagrams;
  const entry = list.find((d) => d.id === id);
  if (entry) {
    currentSvg.set(entry.svg);
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
}

function toggleDiagnostics() {
  showDiagnostics = !showDiagnostics;
}

// Sync SVG to viewer web component
$effect(() => {
  if (!viewerEl) return;
  viewerEl.svg = $currentSvg;
});

// Sync theme to viewer web component
$effect(() => {
  if (!viewerEl) return;
  viewerEl.theme = $theme;
});

// Sync diagnostics to viewer web component
$effect(() => {
  if (!viewerEl) return;
  viewerEl.diagnostics = $diagnosticsStore;
});

function handleViewerRef(el: HTMLElement) {
  viewerEl = el as ViewerElement;
}
</script>

<svelte:head>
  <title>DrawSpec Preview</title>
  <script type="module" src="/viewer.js"></script>
</svelte:head>

<div class="app-shell">
  <header class="toolbar">
    <button class="toolbar-btn" onclick={toggleSidebar} title="Toggle sidebar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    <span class="toolbar-title">DrawSpec</span>
    <div class="toolbar-actions">
      <button
        class="toolbar-btn"
        onclick={toggleDiagnostics}
        title="Toggle diagnostics"
        class:active={showDiagnostics}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </button>
      <ThemeToggle />
      <ConnectionStatus />
    </div>
  </header>

  <div class="body">
    <aside class="sidebar" class:collapsed={sidebarCollapsed}>
      {#if !sidebarCollapsed}
        <DiagramList
          diagrams={$diagrams}
          selectedId={$selectedId}
          onselect={selectDiagram}
        />
      {/if}
    </aside>

    <main class="main">
      <div class="viewer-container">
        <drawspec-diagram
          use:handleViewerRef
          id="viewer"
          interactive
        ></drawspec-diagram>
      </div>

      {#if showDiagnostics}
        <DiagnosticsPanel onclose={toggleDiagnostics} />
      {/if}
    </main>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: var(--toolbar-height);
    padding: 0 0.75rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    transition: background var(--transition-speed);
  }

  .toolbar-title {
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: -0.01em;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition:
      background var(--transition-speed),
      color var(--transition-speed);
  }

  .toolbar-btn:hover {
    background: var(--color-primary-light);
    color: var(--color-primary);
  }

  .toolbar-btn.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
  }

  .body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    width: var(--sidebar-width);
    background: var(--color-sidebar-bg);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
    flex-shrink: 0;
    transition:
      width var(--transition-speed),
      background var(--transition-speed);
  }

  .sidebar.collapsed {
    width: 0;
    border-right: none;
    overflow: hidden;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .viewer-container {
    flex: 1;
    padding: 0.75rem;
    overflow: auto;
  }
</style>
