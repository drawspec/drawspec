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

layout ← uml-sequence (sequence layout)
layout ← architecture (graph layout)
renderer-svg ← layout (positioned diagrams)
validation ← architecture (architecture rules)

layout-dagre, layout-elk, layout-wasm ← layout (implement LayoutEngine interface)

exporter-mermaid, exporter-plantuml, exporter-d2 ← core (read IR, export to format)

preview ← viewer (web component)
```

## Key Interfaces
- `DiagramDocument` (core) — the IR root type
- `LayoutEngine` (layout) — interface for layout strategies
- `SvgRenderer` (renderer-svg) — deterministic SVG output
- `Diagnostic` (core) — validation diagnostics
- `IdRegistry` (core) — deterministic ID allocation with collision detection
- `DocDocument` (docs) — documentation IR root

## Build Order
1. `core` (no deps)
2. Diagram types, `architecture`, `validation` (depend on core)
3. `layout` (depends on core)
4. `layout-dagre`, `layout-elk`, `layout-wasm` (depend on layout)
5. `renderer-svg` (depends on core, layout)
6. `cache` (depends on core)
7. `docs` (depends on core)
8. Exporters (depend on core)
9. `cli`, `viewer`, `lsp`, `vite-plugin`, `testkit` (depend on multiple)
10. `preview` app (depends on viewer)

## CLI Commands
```
drawspec check [files...]     — Validate diagrams
drawspec render [files...] [--out dir] [--format svg] [--theme name]
drawspec inspect [file]       — Debug IR output
drawspec serve [files...] [--host] [--port]  — Preview server with live reload
drawspec watch [files...]     — Watch and rebuild on changes
```
