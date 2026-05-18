# DrawSpec — Package Dependencies

## Dependency Graph (Stage 1)
```
core ← uml-sequence
core ← architecture
core ← validation
core ← layout
core ← renderer-svg
core ← cli (imports all packages)
core ← viewer (imports core, renderer-svg)
core ← testkit (imports core, validation, layout, renderer-svg)

layout ← uml-sequence (sequence layout)
layout ← architecture (graph layout)
renderer-svg ← layout (positioned diagrams)
validation ← architecture (architecture rules)
```

## Key Interfaces
- `DiagramDocument` (core) — the IR root type
- `LayoutEngine` (layout) — interface for layout strategies
- `SvgRenderer` (renderer-svg) — deterministic SVG output
- `Diagnostic` (core) — validation diagnostics
- `IdRegistry` (core) — deterministic ID allocation with collision detection

## Build Order
1. `core` (no deps)
2. `uml-sequence`, `architecture`, `validation` (depend on core)
3. `layout` (depends on core)
4. `renderer-svg` (depends on core, layout)
5. `cli`, `viewer`, `testkit` (depend on multiple)
