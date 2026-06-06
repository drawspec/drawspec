<svelte:options />

<script lang="ts">
import type { SerializedElement } from "./types";
import VirtualList from "./VirtualList.svelte";

/**
 * Props for the ElementList component.
 * Displays a scrollable list of architecture elements with virtual scrolling.
 */
interface Props {
  /** Elements to display. */
  elements: readonly SerializedElement[];
  /** Set of highlighted element IDs (from search). */
  highlightedIds: ReadonlySet<string>;
  /** Set of hidden element IDs. */
  hiddenIds: ReadonlySet<string>;
  /** Currently selected element ID, if any. */
  selectedId: string | undefined;
  /** Callback when an element is clicked. */
  onSelect?: (elementId: string) => void;
}

let { elements, highlightedIds, hiddenIds, selectedId, onSelect }: Props = $props();

const ITEM_HEIGHT = 44;

function handleClick(elementId: string): void {
  onSelect?.(elementId);
}
</script>

{#if elements.length > 0}
  <div class="element-list">
    <VirtualList items={elements} itemHeight={ITEM_HEIGHT} overscan={8}>
      {#snippet children(item, _index, style)}
        {@const el = item as SerializedElement}
        {@const isHidden = hiddenIds.has(el.id)}
        {@const isHighlighted = highlightedIds.has(el.id)}
        {@const isSelected = selectedId === el.id}
        {@const hasChildren = el.childIds.length > 0}
        {@const kindLabel = el.kind.replace(/([a-z])([A-Z])/g, "$1 $2")}
        <div
          class="element-item"
          class:element-item--hidden={isHidden}
          class:element-item--highlighted={isHighlighted}
          class:element-item--selected={isSelected}
          class:element-item--group={hasChildren}
          style={style}
          role="listitem"
          tabindex="0"
          onclick={() => handleClick(el.id)}
          onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(el.id); } }}
        >
          <span class="element-kind" data-kind={el.kind}>{kindLabel}</span>
          <span class="element-name">{el.name}</span>
          {#if hasChildren}
            <span class="element-badge">{el.childIds.length}</span>
          {/if}
        </div>
      {/snippet}
    </VirtualList>
  </div>
{:else}
  <div class="element-list-empty">
    <span>No elements</span>
  </div>
{/if}

<style>
  .element-list {
    height: 100%;
    overflow: hidden;
  }
  .element-list-empty {
    padding: 1rem;
    text-align: center;
    color: #94a3b8;
    font-size: 0.875rem;
  }
  .element-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    cursor: pointer;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    box-sizing: border-box;
  }
  .element-item:hover {
    background: #f1f5f9;
  }
  .element-item--selected {
    background: #dbeafe;
  }
  .element-item--highlighted {
    background: #fef3c7;
  }
  .element-item--hidden {
    opacity: 0.4;
  }
  .element-item--group {
    font-weight: 500;
  }
  .element-kind {
    font-size: 0.7rem;
    padding: 0.15rem 0.35rem;
    border-radius: 0.25rem;
    background: #e2e8f0;
    color: #475569;
    text-transform: capitalize;
    flex-shrink: 0;
  }
  .element-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.85rem;
  }
  .element-badge {
    font-size: 0.7rem;
    background: #cbd5e1;
    color: #334155;
    border-radius: 50%;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  :global(.dark) .element-item {
    border-color: #334155;
  }
  :global(.dark) .element-item:hover {
    background: #1e293b;
  }
  :global(.dark) .element-item--selected {
    background: #1e3a5f;
  }
  :global(.dark) .element-item--highlighted {
    background: #422006;
  }
  :global(.dark) .element-kind {
    background: #334155;
    color: #94a3b8;
  }
  :global(.dark) .element-badge {
    background: #475569;
    color: #e2e8f0;
  }
</style>
