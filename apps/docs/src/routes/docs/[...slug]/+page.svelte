<script lang="ts">
import { onMount } from "svelte";

let { data } = $props();

onMount(() => {
  const codeBlocks = document.querySelectorAll(".ds-code-block");
  codeBlocks.forEach((block) => {
    const button = document.createElement("button");
    button.className = "copy-code-btn";
    button.setAttribute("aria-label", "Copy code");
    button.setAttribute("type", "button");
    button.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    block.appendChild(button);
    button.addEventListener("click", async () => {
      const code = block.querySelector("code");
      const text = code?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        button.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => {
          button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        }, 1500);
      } catch {
        // Silently fail - clipboard may be unavailable in some browsers/contexts
      }
    });
  });
});
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
    position: relative;
  }

  .doc-rendered :global(.copy-code-btn) {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    opacity: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.25rem;
    cursor: pointer;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity var(--transition-speed), color var(--transition-speed);
  }

  .doc-rendered :global(.ds-code-block:hover .copy-code-btn),
  .doc-rendered :global(.copy-code-btn:focus) {
    opacity: 1;
  }

  .doc-rendered :global(.copy-code-btn:hover) {
    color: var(--color-text);
    border-color: var(--color-border-focus);
  }

  .doc-rendered :global(.copy-code-btn:focus-visible) {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
  }
</style>
