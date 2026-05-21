import type { DiagramDocument } from "@drawspec/core";
import { escapeHtml } from "./html";

export interface SiteDiagram {
  id: string;
  title: string;
  kind: string;
  nodeCount: number;
  edgeCount: number;
  pageFileName: string;
  svg: string;
}

export function generateStyleCss(): string {
  return `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--color-bg:#f8fafc;--color-surface:#fff;--color-text:#0f172a;--color-text-muted:#64748b;--color-border:#e2e8f0;--color-primary:#3b82f6;--radius:8px;--max-width:72rem}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--color-bg);color:var(--color-text);line-height:1.6;min-height:100vh}
a{color:var(--color-primary);text-decoration:none}
a:hover{text-decoration:underline}
header{background:var(--color-surface);border-bottom:1px solid var(--color-border);padding:1rem 2rem}
header h1{font-size:1.25rem;font-weight:600}
header p{color:var(--color-text-muted);font-size:.875rem}
main{max-width:var(--max-width);margin:0 auto;padding:2rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(20rem,1fr));gap:1.5rem}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);overflow:hidden;transition:box-shadow .15s}
.card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
.card-preview{padding:1rem;display:flex;align-items:center;justify-content:center;min-height:8rem;overflow:hidden}
.card-preview svg{max-width:100%;max-height:12rem}
.card-body{padding:.75rem 1rem 1rem;border-top:1px solid var(--color-border)}
.card-body h2{font-size:1rem;margin-bottom:.25rem}
.card-body .meta{color:var(--color-text-muted);font-size:.8rem}
.diagram-svg{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);padding:2rem;display:flex;justify-content:center;overflow:auto}
.diagram-svg svg{max-width:100%;height:auto}
.meta-list{margin-top:1.5rem;display:flex;gap:2rem;flex-wrap:wrap}
.meta-list dt{font-weight:600;font-size:.8rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em}
.meta-list dd{font-size:.95rem}
.back{display:inline-block;margin-bottom:1rem;font-size:.875rem}
`;
}

export function generateIndexHtml(diagrams: readonly SiteDiagram[]): string {
  const cards = diagrams
    .map(
      (d) => `    <a class="card" href="${escapeHtml(d.pageFileName)}">
      <div class="card-preview">${d.svg}</div>
      <div class="card-body">
        <h2>${escapeHtml(d.title)}</h2>
        <div class="meta">${escapeHtml(d.kind)} &middot; ${formatCount(d.nodeCount, "node")} &middot; ${formatCount(d.edgeCount, "edge")}</div>
      </div>
    </a>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DrawSpec Diagrams</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>DrawSpec Diagrams</h1>
    <p>${diagrams.length} diagram${diagrams.length === 1 ? "" : "s"}</p>
  </header>
  <main>
    <div class="grid">
${cards}
    </div>
  </main>
</body>
</html>
`;
}

export function generateDiagramHtml(diagram: SiteDiagram): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(diagram.title)} — DrawSpec</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>${escapeHtml(diagram.title)}</h1>
    <p><a href="index.html">All diagrams</a></p>
  </header>
  <main>
    <a class="back" href="index.html">&larr; Back to index</a>
    <div class="diagram-svg">${diagram.svg}</div>
    <dl class="meta-list">
      <div>
        <dt>ID</dt>
        <dd>${escapeHtml(diagram.id)}</dd>
      </div>
      <div>
        <dt>Kind</dt>
        <dd>${escapeHtml(diagram.kind)}</dd>
      </div>
      <div>
        <dt>Nodes</dt>
        <dd>${diagram.nodeCount}</dd>
      </div>
      <div>
        <dt>Edges</dt>
        <dd>${diagram.edgeCount}</dd>
      </div>
    </dl>
  </main>
</body>
</html>
`;
}

export function toSiteDiagram(
  document: DiagramDocument,
  svg: string,
  pageFileName = `${safeFileName(document.id)}.html`
): SiteDiagram {
  return {
    id: document.id,
    title: document.title ?? document.id,
    kind: document.kind,
    nodeCount: document.nodes.length,
    edgeCount: document.edges.length,
    pageFileName,
    svg,
  };
}

export function safeFileName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

function formatCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
