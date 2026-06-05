<script lang="ts">
let { lang, code, html }: { lang: string; code: string; html: string } = $props();
let copied = $state(false);

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  } catch {
    // clipboard unavailable
  }
}
</script>

<div class="code-block">
  <div class="code-header">
    <span class="code-lang">{lang}</span>
    <button class="copy-btn" type="button" onclick={copyCode} aria-label="Copy code">
      {#if copied}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      {/if}
    </button>
  </div>
  <div class="code-body">
    {@html html}
  </div>
</div>

<style>
  .code-block {
    margin: 1.25rem 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: var(--color-code-bg);
  }

  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 0.75rem;
    background: color-mix(in oklch, var(--color-code-bg) 80%, var(--color-text) 6%);
    border-bottom: 1px solid var(--color-border);
  }

  .code-lang {
    font-family: "SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 0.25rem;
    border-radius: 4px;
    transition:
      color var(--transition-speed),
      background var(--transition-speed);
  }

  .copy-btn :global(svg) {
    display: block;
  }

  .copy-btn:hover {
    color: var(--color-text);
    background: color-mix(in oklch, var(--color-text) 8%, transparent);
  }

  .code-body {
    overflow-x: auto;
  }

  .code-body :global(pre) {
    margin: 0;
    padding: 1rem;
    background: transparent !important;
    font-size: 0.875rem;
    line-height: 1.7;
  }

  .code-body :global(code) {
    background: transparent !important;
    font-family: "SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace;
    padding: 0;
  }
</style>
