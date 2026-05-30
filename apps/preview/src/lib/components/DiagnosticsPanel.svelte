<script lang="ts">
import { diagnostics } from "$lib/stores/diagram";

interface Props {
  onclose: () => void;
}

let { onclose }: Props = $props();

let severityIcon = {
  error: "✕",
  warning: "⚠",
  info: "ℹ",
  hint: "💡",
};

let errorCount = $derived($diagnostics.filter((d) => d.severity === "error").length);
let warningCount = $derived($diagnostics.filter((d) => d.severity === "warning").length);
</script>

<div class="panel">
  <div class="panel-header">
    <div class="panel-title">
      <h3>Diagnostics</h3>
      <div class="badges">
        {#if errorCount > 0}
          <span class="badge error">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
        {/if}
        {#if warningCount > 0}
          <span class="badge warning">{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>
        {/if}
        {#if errorCount === 0 && warningCount === 0}
          <span class="badge ok">No issues</span>
        {/if}
      </div>
    </div>
    <button class="close-btn" onclick={onclose} title="Close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>

  <div class="panel-body">
    {#if $diagnostics.length === 0}
      <p class="empty">No diagnostics to display.</p>
    {:else}
      <ul class="diagnostic-list">
        {#each $diagnostics as diag, i (i)}
          <li class="diagnostic-item" class:error={diag.severity === "error"} class:warning={diag.severity === "warning"}>
            <span class="icon">{severityIcon[diag.severity] ?? "ℹ"}</span>
            <span class="message">{diag.message}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .panel {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 16rem;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    transition: background var(--transition-speed);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border-light);
    flex-shrink: 0;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .panel-title h3 {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badges {
    display: flex;
    gap: 0.375rem;
  }

  .badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 9999px;
    font-weight: 500;
  }

  .badge.error {
    background: #fef2f2;
    color: #dc2626;
  }

  :global([data-theme="dark"]) .badge.error {
    background: #450a0a;
    color: #f87171;
  }

  .badge.warning {
    background: var(--color-warning-bg);
    color: #b45309;
  }

  :global([data-theme="dark"]) .badge.warning {
    color: #fbbf24;
  }

  .badge.ok {
    background: #f0fdf4;
    color: #16a34a;
  }

  :global([data-theme="dark"]) .badge.ok {
    background: #052e16;
    color: #4ade80;
  }

  .close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: 0.25rem;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .close-btn:hover {
    background: var(--color-primary-light);
    color: var(--color-primary);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0.75rem;
  }

  .empty {
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    margin: 1rem 0;
  }

  .diagnostic-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .diagnostic-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.3rem 0;
    font-size: 0.8rem;
  }

  .diagnostic-item .icon {
    flex-shrink: 0;
    width: 1.1rem;
    text-align: center;
  }

  .diagnostic-item.error .icon {
    color: var(--color-error);
  }

  .diagnostic-item.warning .icon {
    color: var(--color-warning-border);
  }

  .diagnostic-item .message {
    word-break: break-word;
  }
</style>
