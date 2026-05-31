<script lang="ts">
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
  <div class="doc-rendered">
    {@html data.html}
  </div>
</article>

<style>
  .doc-page {
    max-width: var(--max-content-width);
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
    overflow-x: auto;
  }

  .doc-rendered :global(.ds-diagram svg) {
    max-width: 100%;
    height: auto;
  }

  .doc-rendered :global(.ds-code-block) {
    margin: 1.25rem 0;
  }
</style>
