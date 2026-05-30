<script>
let { data } = $props();

const placeholders = {
  "getting-started": {
    title: "Getting Started",
    content: `
        <h2>Installation</h2>
        <p>Create a new project and install the DrawSpec CLI:</p>
        <pre><code>mkdir my-diagram && cd my-diagram
bun init
bun add -d @drawspec/cli @drawspec/uml-sequence</code></pre>
        <h2>Your First Diagram</h2>
        <p>Create a sequence diagram in <code>hello.sequence.ts</code>:</p>
        <pre><code>import { sequence } from "@drawspec/uml-sequence";

sequence("Hello", (s) => {
  s.actor("Alice");
  s.actor("Bob");
  s.message("Alice", "Bob", "Hello!");
});</code></pre>
        <h2>Render to SVG</h2>
        <pre><code>bunx drawspec render hello.sequence.ts --out .</code></pre>
        <p>This produces <code>hello.sequence.svg</code> in the current directory.</p>
      `,
  },
  "cli-reference": {
    title: "CLI Reference",
    content: `
        <h2>drawspec</h2>
        <p>The DrawSpec CLI provides commands for rendering, validating, and serving diagrams.</p>
        <h2>Commands</h2>
        <h3>render</h3>
        <p>Render diagram files to SVG:</p>
        <pre><code>bunx drawspec render &lt;files...&gt; --out &lt;dir&gt;</code></pre>
        <h3>check</h3>
        <p>Validate diagram files without rendering:</p>
        <pre><code>bunx drawspec check &lt;files...&gt;</code></pre>
        <h3>serve</h3>
        <p>Start a dev server with live reload:</p>
        <pre><code>bunx drawspec serve &lt;dir&gt;</code></pre>
      `,
  },
  "api/core": {
    title: "Core API",
    content: `
        <h2>@drawspec/core</h2>
        <p>The core package provides the diagram IR, compilation pipeline, diagnostics system, and deterministic ID generation.</p>
        <h2>Diagram IR</h2>
        <p>Every diagram is represented as a typed <code>Diagram</code> object with nodes, edges, and metadata.</p>
        <h2>Compilation</h2>
        <p>The compilation pipeline validates and transforms diagram definitions into the canonical IR ready for rendering.</p>
      `,
  },
  "api/docs": {
    title: "Docs Engine API",
    content: `
        <h2>@drawspec/docs</h2>
        <p>The documentation engine provides a structured API for defining and rendering documentation.</p>
        <h2>defineDoc()</h2>
        <p>Create a document definition with structured or freeform content:</p>
        <pre><code>import { defineDoc } from "@drawspec/docs";

const doc = defineDoc({
  title: "My Guide",
  content: [/* DocBlock nodes */]
});</code></pre>
        <h2>renderDocHtml()</h2>
        <p>Render a compiled document to HTML with syntax highlighting:</p>
        <pre><code>import { compileDoc, renderDocHtml } from "@drawspec/docs";

const compiled = compileDoc(doc);
const html = await renderDocHtml(compiled);</code></pre>
      `,
  },
};

const page = $derived(
  data.slug
    ? (placeholders[data.slug] ?? { title: data.slug, content: "<p>Content coming soon.</p>" })
    : null
);
</script>

<svelte:head>
  <title>{page ? page.title : 'Documentation'} — DrawSpec</title>
</svelte:head>

{#if page}
  <div class="doc-page">
    <h1>{page.title}</h1>
    {@html page.content}
  </div>
{:else}
  <div class="doc-page">
    <h1>Documentation</h1>
    <p>Choose a topic from the sidebar to get started.</p>
  </div>
{/if}

<style>
  .doc-page {
    max-width: var(--max-content-width);
  }

  .doc-page :global(h1) {
    margin-top: 0;
  }
</style>
