<script lang="ts">
import MiniSearch from "minisearch";
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { base } from "$app/paths";

interface SearchIndexPayload {
  version: 1;
  options?: {
    fields: string[];
    storeFields: string[];
    searchOptions: {
      boost: Record<string, number>;
      fuzzy: number;
      prefix: boolean;
    };
  };
  index?: unknown;
}

interface SearchResultItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  text?: string;
  score: number;
}

let query = $state("");
let open = $state(false);
let activeIndex = $state(0);
let search = $state<MiniSearch | undefined>(undefined);
let loadFailed = $state(false);

const results = $derived.by(() => {
  const normalizedQuery = query.trim();
  if (search === undefined || normalizedQuery.length < 2) return [];

  return (search.search(normalizedQuery) as SearchResultItem[]).slice(0, 8).map((result) => ({
    ...result,
    description: result.description ?? "",
    text: result.text ?? "",
  }));
});

onMount(async () => {
  try {
    const response = await fetch(`${base}/search-index.json`);
    if (!response.ok) throw new Error(`Failed to load search index: ${response.status}`);
    const payload = (await response.json()) as SearchIndexPayload;
    if (payload.options === undefined || payload.index === undefined) return;
    search = MiniSearch.loadJSON(JSON.stringify(payload.index), {
      fields: payload.options.fields,
      storeFields: payload.options.storeFields,
      searchOptions: payload.options.searchOptions,
    });
  } catch {
    loadFailed = true;
  }
});

function handleInput() {
  open = query.trim().length >= 2;
  activeIndex = 0;
}

function handleFocus() {
  open = query.trim().length >= 2;
}

function handleBlur() {
  setTimeout(() => {
    open = false;
  }, 120);
}

function handleKeydown(event: KeyboardEvent) {
  if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
    open = results.length > 0;
  }

  if (event.key === "Escape") {
    open = false;
    return;
  }

  if (results.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex = (activeIndex + 1) % results.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex = (activeIndex - 1 + results.length) % results.length;
  } else if (event.key === "Enter") {
    event.preventDefault();
    navigateTo(results[activeIndex]);
  }
}

function navigateTo(result: SearchResultItem) {
  query = "";
  open = false;
  void goto(`${base}/${result.slug}`);
}

function resultSnippet(result: SearchResultItem): string {
  const source = result.description || result.text || result.title;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const lowerSource = source.toLowerCase();
  const matchIndex = terms.reduce((best, term) => {
    const index = lowerSource.indexOf(term);
    return index === -1 ? best : Math.min(best, index);
  }, Number.POSITIVE_INFINITY);

  if (!Number.isFinite(matchIndex)) return truncate(source, 140);

  const start = Math.max(0, matchIndex - 48);
  const end = Math.min(source.length, matchIndex + 112);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < source.length ? "…" : "";
  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

function highlightedSnippet(result: SearchResultItem): string {
  const snippet = escapeHtml(resultSnippet(result));
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .map(escapeRegExp);

  if (terms.length === 0) return snippet;
  return snippet.replace(new RegExp(`(${terms.join("|")})`, "gi"), "<mark>$1</mark>");
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1).trim()}…` : value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
</script>

<div class="docs-search" role="search">
  <label class="visually-hidden" for="docs-search-input">Search documentation</label>
  <input
    id="docs-search-input"
    class="search-input"
    type="search"
    role="combobox"
    placeholder="Search docs…"
    autocomplete="off"
    spellcheck="false"
    bind:value={query}
    oninput={handleInput}
    onfocus={handleFocus}
    onblur={handleBlur}
    onkeydown={handleKeydown}
    aria-expanded={open}
    aria-controls="docs-search-results"
    aria-autocomplete="list"
  />

  {#if open}
    <div id="docs-search-results" class="results" role="listbox" aria-label="Search results">
      {#if results.length > 0}
        {#each results as result, index (result.id)}
          <button
            type="button"
            class:active={index === activeIndex}
            class="result"
            role="option"
            aria-selected={index === activeIndex}
            onmousedown={(event) => event.preventDefault()}
            onclick={() => navigateTo(result)}
          >
            <span class="result-title">{result.title}</span>
            <span class="result-snippet">{@html highlightedSnippet(result)}</span>
          </button>
        {/each}
      {:else if loadFailed}
        <p class="empty">Search index unavailable.</p>
      {:else}
        <p class="empty">No results found.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .docs-search {
    position: relative;
    width: 100%;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .search-input {
    width: 100%;
    height: 2.25rem;
    padding: 0 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-bg);
    color: var(--color-text);
    font: inherit;
    font-size: 0.875rem;
    outline: none;
    transition:
      background var(--transition-speed),
      border-color var(--transition-speed),
      box-shadow var(--transition-speed);
  }

  .search-input::placeholder {
    color: var(--color-text-subtle);
  }

  .search-input:focus {
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-border-focus) 20%, transparent);
  }

  .results {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    left: 0;
    z-index: 200;
    max-height: min(28rem, calc(100vh - var(--header-height) - 1rem));
    overflow-y: auto;
    padding: 0.375rem;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: color-mix(in oklch, var(--color-surface) 96%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
  }

  :global(.dark) .results {
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
  }

  .result {
    display: block;
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
  }

  .result:hover,
  .result.active {
    background: var(--color-sidebar-active);
  }

  .result-title {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    line-height: 1.35;
  }

  .result-snippet {
    display: block;
    margin-top: 0.2rem;
    color: var(--color-text-muted);
    font-size: 0.8125rem;
    line-height: 1.45;
  }

  .result-snippet :global(mark) {
    color: var(--color-text);
    background: var(--color-primary-light);
    border-radius: 3px;
    padding: 0 0.12em;
  }

  .empty {
    margin: 0;
    padding: 0.875rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }

  @media (max-width: 520px) {
    .docs-search {
      order: 3;
      grid-column: 1 / -1;
    }
  }
</style>
