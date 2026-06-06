<svelte:options />

<script lang="ts">
import type { Snippet } from "svelte";

/**
 * Props for the VirtualList component.
 *
 * @typeParam T - The type of items in the list.
 */
interface Props<T> {
  /** Items to render in the virtual list. */
  items: readonly T[];
  /** Fixed height per item in pixels. */
  itemHeight: number;
  /** Number of extra items to render above/below the visible viewport. Default: 5. */
  overscan?: number;
  /** Snippet that renders a single item. Receives the item, its index, and inline style. */
  children: Snippet<[item: T, index: number, style: string]>;
}

let { items, itemHeight, overscan = 5, children }: Props<unknown> = $props();

let containerEl: HTMLDivElement | undefined = $state();
let scrollTop = $state(0);
let containerHeight = $state(0);

const buffer = $derived(overscan);

const totalHeight = $derived(items.length * itemHeight);

const startIndex = $derived(Math.max(0, Math.floor(scrollTop / itemHeight) - buffer));

const endIndex = $derived(
  Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer)
);

const visibleItems = $derived(
  items.length === 0
    ? []
    : Array.from({ length: endIndex - startIndex + 1 }, (_, i) => {
        const idx = startIndex + i;
        const item = items[idx];
        return item !== undefined ? { item, index: idx } : null;
      }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
);

const offsetY = $derived(startIndex * itemHeight);

function onScroll(): void {
  if (!containerEl) return;
  scrollTop = containerEl.scrollTop;
}

$effect(() => {
  if (!containerEl) return;
  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      containerHeight = entry.contentRect.height;
    }
  });
  observer.observe(containerEl);
  return () => observer.disconnect();
});
</script>

<div
  class="virtual-list"
  bind:this={containerEl}
  onscroll={onScroll}
  role="list"
  aria-label="Virtual scrolling list"
>
  <div class="virtual-list-spacer" style="height: {totalHeight}px; position: relative;">
    <div style="transform: translateY({offsetY}px);">
      {#each visibleItems as { item, index } (index)}
        {@render children(item, index, `height: ${itemHeight}px;`)}
      {/each}
    </div>
  </div>
</div>

<style>
  .virtual-list {
    overflow-y: auto;
    contain: strict;
    height: 100%;
  }
  .virtual-list-spacer {
    width: 100%;
  }
</style>
