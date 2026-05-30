<script>
import { base } from "$app/paths";

const quickStart = `import { sequence } from "@drawspec/uml-sequence";

sequence("Hello", (s) => {
  s.actor("Alice");
  s.actor("Bob");
  s.message("Alice", "Bob", "Hello!");
});`;
</script>

<svelte:head>
  <title>DrawSpec — Diagram-as-Code</title>
  <meta name="description" content="TypeScript-native diagram-as-code platform. Author diagrams as TypeScript, validate in CI, render deterministic SVGs." />
</svelte:head>

<div class="hero">
  <h1 class="hero-title">DrawSpec</h1>
  <p class="hero-tagline">
    TypeScript-native diagram-as-code.<br />
    Author. Validate. Render.
  </p>
  <div class="hero-actions">
    <a href="{base}/docs/getting-started" class="btn btn-primary">Get Started</a>
    <a href="{base}/docs/cli-reference" class="btn btn-secondary">CLI Reference</a>
  </div>
</div>

<section class="section">
  <h2>Quick Start</h2>
  <pre><code>{quickStart}</code></pre>
  <p class="section-aside">
    Render with <code>bunx drawspec render hello.sequence.ts --out .</code>
  </p>
</section>

<section class="section">
  <h2>Explore the Docs</h2>
  <div class="card-grid">
    <a href="{base}/docs/getting-started" class="card">
      <h3>Getting Started</h3>
      <p>Install, create your first diagram, and render to SVG.</p>
    </a>
    <a href="{base}/docs/cli-reference" class="card">
      <h3>CLI Reference</h3>
      <p>Complete reference for the <code>drawspec</code> CLI commands.</p>
    </a>
    <a href="{base}/docs/api/core" class="card">
      <h3>Core API</h3>
      <p>Diagram IR, compilation pipeline, and type definitions.</p>
    </a>
    <a href="{base}/docs/api/docs" class="card">
      <h3>Docs Engine API</h3>
      <p>Documentation engine for building doc sites like this one.</p>
    </a>
  </div>
</section>

<style>
  .hero {
    text-align: center;
    padding: 4rem 1rem 3rem;
    max-width: var(--max-content-width);
    margin: 0 auto;
  }

  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 0.75rem;
    background: linear-gradient(
      135deg,
      var(--color-hero-gradient-start),
      var(--color-hero-gradient-end)
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero-tagline {
    font-size: 1.25rem;
    color: var(--color-text-muted);
    margin: 0 0 2rem;
    line-height: 1.6;
  }

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.625rem 1.5rem;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 500;
    text-decoration: none;
    transition:
      background var(--transition-speed),
      color var(--transition-speed),
      border-color var(--transition-speed);
  }

  .btn:hover {
    text-decoration: none;
  }

  .btn-primary {
    background: var(--color-primary);
    color: #ffffff;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    color: #ffffff;
  }

  .btn-secondary {
    background: transparent;
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    border-color: var(--color-border-focus);
    color: var(--color-primary);
  }

  .section {
    max-width: var(--max-content-width);
    margin: 0 auto;
    padding: 0 1rem 3rem;
  }

  .section h2 {
    margin-bottom: 1rem;
  }

  .section-aside {
    color: var(--color-text-muted);
    font-size: 0.9375rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1rem;
  }

  .card {
    display: block;
    padding: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition:
      border-color var(--transition-speed),
      box-shadow var(--transition-speed);
  }

  .card:hover {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary);
    text-decoration: none;
    color: inherit;
  }

  .card h3 {
    font-size: 1rem;
    margin: 0 0 0.5rem;
    color: var(--color-primary);
  }

  .card p {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    .hero-title {
      font-size: 2.5rem;
    }

    .hero {
      padding: 2.5rem 1rem 2rem;
    }

    .card-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
