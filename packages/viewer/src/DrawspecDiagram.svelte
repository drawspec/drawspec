<svelte:options
  customElement={{
    tag: "drawspec-diagram",
    props: {
      src: { type: "String", reflect: true },
      theme: { type: "String", reflect: true },
      interactive: { type: "Boolean", reflect: true },
      svg: { type: "String" },
      diagnostics: { type: "Array" },
    },
  }}
/>

<script lang="ts">
import type { Diagnostic } from "@drawspec/core";
import { normalizeViewerPayload, renderDiagramSvg } from "./render";
import type { DrawspecTheme } from "./types";

let {
  src = "",
  theme = "light",
  interactive = true,
  svg = "",
  diagnostics = [],
} = $props<{
  src?: string;
  theme?: DrawspecTheme;
  interactive?: boolean;
  svg?: string;
  diagnostics?: Diagnostic[];
}>();

let renderedSvg = $state("");
let activeDiagnostics = $state<Diagnostic[]>([]);
let scale = $state(1);
let translateX = $state(0);
let translateY = $state(0);
let isPanning = false;
let lastX = 0;
let lastY = 0;

$effect(() => {
  if (src.length === 0) return;
  void loadSource(src, theme);
});

$effect(() => {
  renderedSvg = svg;
});

$effect(() => {
  activeDiagnostics = diagnostics;
});

async function loadSource(url: string, activeTheme: DrawspecTheme): Promise<void> {
  try {
    const response = await fetch(url);
    const payload = normalizeViewerPayload(await response.json());
    activeDiagnostics = payload.diagnostics ?? [];
    renderedSvg =
      payload.svg ??
      (payload.document === undefined ? "" : await renderDiagramSvg(payload.document, activeTheme));
  } catch (error) {
    activeDiagnostics = [
      {
        code: "viewer/load",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function zoom(delta: number): void {
  scale = Math.min(4, Math.max(0.2, scale + delta));
}

function resetView(): void {
  scale = 1;
  translateX = 0;
  translateY = 0;
}

function onWheel(event: WheelEvent): void {
  if (!interactive) return;
  event.preventDefault();
  zoom(event.deltaY < 0 ? 0.1 : -0.1);
}

function startPan(event: PointerEvent): void {
  if (!interactive) return;
  isPanning = true;
  lastX = event.clientX;
  lastY = event.clientY;
}

function movePan(event: PointerEvent): void {
  if (!isPanning) return;
  translateX += event.clientX - lastX;
  translateY += event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
}
</script>

<section class:dark={theme === "dark"} class="viewer" aria-label="DrawSpec diagram preview">
  {#if interactive}
    <div class="toolbar" aria-label="Zoom and pan controls">
      <button type="button" on:click={() => zoom(0.2)}>Zoom in</button>
      <button type="button" on:click={() => zoom(-0.2)}>Zoom out</button>
      <button type="button" on:click={resetView}>Reset</button>
    </div>
  {/if}
  <div
    class="canvas"
    on:pointerdown={startPan}
    on:pointermove={movePan}
    on:pointerup={() => (isPanning = false)}
    on:pointerleave={() => (isPanning = false)}
    on:wheel={onWheel}
  >
    <div class="surface" style={`transform: translate(${translateX}px, ${translateY}px) scale(${scale});`}>
      {@html renderedSvg}
    </div>
  </div>
  {#if activeDiagnostics.length > 0}
    <aside class="diagnostics" aria-label="Diagnostics">
      <h2>Diagnostics</h2>
      {#each activeDiagnostics as item}
        <p class={item.severity}><strong>{item.severity}</strong> {item.code}: {item.message}</p>
      {/each}
    </aside>
  {/if}
</section>

<style>
  :host { display: block; min-height: 24rem; }
  .viewer { position: relative; display: grid; grid-template-rows: auto 1fr auto; gap: .75rem; min-height: inherit; color: #0f172a; }
  .viewer.dark { color: #f8fafc; }
  .toolbar { display: flex; gap: .5rem; flex-wrap: wrap; }
  button { border: 1px solid #94a3b8; border-radius: .5rem; background: #fff; color: #0f172a; padding: .4rem .65rem; cursor: pointer; }
  .canvas { overflow: hidden; border: 1px solid #cbd5e1; border-radius: .75rem; background: #f8fafc; min-height: 24rem; touch-action: none; }
  .dark .canvas { background: #020617; border-color: #334155; }
  .surface { transform-origin: 0 0; width: max-content; min-width: 100%; transition: transform 80ms ease; }
  .diagnostics { border: 1px solid #f59e0b; border-radius: .75rem; background: #fffbeb; padding: .75rem; }
  .diagnostics h2 { margin: 0 0 .5rem; font-size: 1rem; }
  .diagnostics p { margin: .25rem 0; }
  .diagnostics .error { color: #991b1b; }
  .diagnostics .warning { color: #92400e; }
</style>
