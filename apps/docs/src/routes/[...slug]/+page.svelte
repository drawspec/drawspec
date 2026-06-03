<script lang="ts">
import { enhanceCodeBlocks } from "$lib/actions/enhance-code-blocks";

let { data } = $props();
</script>

<svelte:head>
  <title>{data.title} — DrawSpec</title>
  {#if data.description}
    <meta name="description" content={data.description} />
  {/if}
</svelte:head>

<article class="doc-page">
  <header class="doc-header">
    <h1>{data.title}</h1>
    {#if data.description}
      <p class="doc-description">{data.description}</p>
    {/if}
  </header>
  <div class="doc-rendered" use:enhanceCodeBlocks>
    {@html data.html}
  </div>
</article>

<style>
  .doc-page {
    max-width: var(--max-content-width);
    margin: 0 auto;
    width: 100%;
  }

  .doc-header h1 {
    margin-top: 0;
  }

  .doc-description {
    color: var(--color-text-muted);
    font-size: 1.125rem;
    margin-bottom: 2rem;
  }

  .doc-rendered :global(.ds-heading) {
    scroll-margin-top: calc(var(--header-height) + 1rem);
  }

  .doc-rendered :global(.ds-diagram) {
    margin: 1.5rem 0;
  }

  .doc-rendered :global(.ds-diagram-link) {
    display: block;
    position: relative;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-surface);
    overflow-x: auto;
    transition:
      border-color var(--transition-speed),
      box-shadow var(--transition-speed),
      background var(--transition-speed);
  }

  .doc-rendered :global(.ds-diagram-link:hover) {
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 1px var(--color-border-focus);
    text-decoration: none;
  }

  .doc-rendered :global(.ds-diagram-link:focus-visible) {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }

  .doc-rendered :global(.ds-diagram-open-label) {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0;
    transition:
      color var(--transition-speed),
      opacity var(--transition-speed);
  }

  .doc-rendered :global(.ds-diagram-link:hover .ds-diagram-open-label),
  .doc-rendered :global(.ds-diagram-link:focus-visible .ds-diagram-open-label) {
    opacity: 1;
  }

  .doc-rendered :global(.ds-diagram-link:hover .ds-diagram-open-label) {
    color: var(--color-primary);
  }

  .doc-rendered :global(.ds-diagram-svg) {
    display: block;
    min-width: min-content;
  }

  .doc-rendered :global(.ds-diagram svg) {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
  }

  .doc-rendered :global(.ds-diagram-svg-dark) {
    display: none;
  }

  :global(.dark) .doc-rendered :global(.ds-diagram-svg-light) {
    display: none;
  }

  :global(.dark) .doc-rendered :global(.ds-diagram-svg-dark) {
    display: block;
  }

  .doc-rendered :global(.ds-code-block) {
    margin: 1.25rem 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-code-bg);
  }

  .doc-rendered :global(.ds-code-block pre) {
    margin: 0;
    padding: 1rem;
    background: transparent !important;
    border-radius: 0;
    border: none;
  }

  .doc-rendered :global(.ds-code-block pre code) {
    background: transparent !important;
    padding: 0;
  }
</style>
