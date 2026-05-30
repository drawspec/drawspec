<script lang="ts">
import type { DiagramEntry } from "$lib/stores/diagram";

interface Props {
  diagrams: DiagramEntry[];
  selectedId: string;
  onselect: (id: string) => void;
}

let { diagrams, selectedId, onselect }: Props = $props();

let filter = $state("");

let filtered = $derived(
  filter.trim() === ""
    ? diagrams
    : diagrams.filter((d) => d.label.toLowerCase().includes(filter.toLowerCase()))
);
</script>

<div class="diagram-list">
  <div class="header">
    <h2>Diagrams</h2>
    <span class="count">{diagrams.length}</span>
  </div>

  <input
    type="text"
    class="filter"
    placeholder="Filter..."
    bind:value={filter}
  />

  <ul class="list">
    {#if filtered.length === 0}
      <li class="empty">
        {#if diagrams.length === 0}
          No diagrams loaded
        {:else}
          No matches
        {/if}
      </li>
    {:else}
      {#each filtered as diagram (diagram.id)}
        <li>
          <button
            class="diagram-btn"
            class:active={diagram.id === selectedId}
            onclick={() => onselect(diagram.id)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
            {diagram.label}
          </button>
        </li>
      {/each}
    {/if}
  </ul>
</div>

<style>
  .diagram-list {
    padding: 0.75rem;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .header h2 {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    background: var(--color-primary-light);
    padding: 0.1rem 0.5rem;
    border-radius: 9999px;
  }

  .filter {
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.8rem;
    outline: none;
    margin-bottom: 0.5rem;
    transition:
      border-color var(--transition-speed),
      background var(--transition-speed);
  }

  .filter:focus {
    border-color: var(--color-primary);
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .empty {
    padding: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-align: center;
  }

  .diagram-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--color-text);
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    transition:
      background var(--transition-speed),
      color var(--transition-speed);
  }

  .diagram-btn:hover {
    background: var(--color-sidebar-active);
  }

  .diagram-btn.active {
    background: var(--color-sidebar-active);
    color: var(--color-primary);
    font-weight: 500;
  }
</style>
