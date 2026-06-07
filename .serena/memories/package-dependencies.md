# DrawSpec — Package Dependencies

## Dependency Graph
```
core ← uml-sequence, uml-class, uml-state, uml-component, uml-deployment, uml-activity
core ← architecture
core ← validation
core ← layout
core ← renderer-svg
core ← docs
core ← cache
core ← cli (imports most packages)
core ← viewer (imports core, renderer-svg)
core ← testkit (imports core, validation, layout, renderer-svg)
core ← lsp

text-measure ← layout (deterministic label measurement/sizing helpers)
text-measure ← renderer-svg (deterministic SVG label measurement/truncation)

layout ← uml-sequence (sequence layout)
layout ← architecture (graph layout)
renderer-svg ← layout (positioned diagrams)
validation ← architecture (architecture rules)

layout-dagre, layout-elk, layout-force, layout-tree, layout-wasm ← layout (implement LayoutEngine interface)
layout-force, layout-tree ← docs only for package `.doc.ts` usage docs (excluded from package build)

exporter-mermaid, exporter-plantuml, exporter-d2 ← core (read IR, export to format)

preview ← viewer (web component)
```

## Key Interfaces
- `DiagramDocument` (core) — the IR root type
- `TextMeasurer` (text-measure) — deterministic text width interface shared by layout and renderers
- `LayoutEngine` (layout) — interface for layout strategies
- `SvgRenderer` (renderer-svg) — deterministic SVG output
- `Diagnostic` (core) — validation diagnostics
- `IdRegistry` (core) — deterministic ID allocation with collision detection
- `DocDocument` (docs) — documentation IR root

## Build Order
1. `core` (no deps)
2. Diagram types, `architecture`, `validation` (depend on core)
3. `text-measure` (no runtime deps)
4. `layout` (depends on core, text-measure)
5. `layout-dagre`, `layout-elk`, `layout-force`, `layout-tree`, `layout-wasm` (depend on layout)
6. `renderer-svg` (depends on core, layout, text-measure)
7. `cache` (depends on core)
8. `docs` (depends on core)
9. Exporters (depend on core)
10. `cli`, `viewer`, `lsp`, `vite-plugin`, `testkit` (depend on multiple)
11. `preview` app (depends on viewer)

## CLI Commands
```
drawspec check [files...]     — Validate diagrams
drawspec render [files...] [--out dir] [--format svg] [--theme name]
drawspec inspect [file]       — Debug IR output
drawspec serve [files...] [--host] [--port]  — Preview server with live reload
drawspec watch [files...]     — Watch and rebuild on changes
```