# DrawSpec — Project Overview

## What
TypeScript-native diagram-as-code platform. Diagrams written as TypeScript using builder APIs, compiled to IR, laid out, and rendered to deterministic SVGs.

## Architecture
- **Monorepo** with Bun workspaces — packages under `packages/`, apps under `apps/`
- **Runtime**: Bun-only (no Node.js)
- **Build**: TypeScript project references, `tsc -b`
- **Linting**: Biome (not ESLint)
- **Testing**: `bun test` (not Vitest/Jest)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`)
- **Pre-commit**: lefthook + biome + cocogitto

## Packages
| Package | Purpose |
|---------|---------|
| `@drawspec/core` | IR types, diagnostics, deterministic IDs, builders, symbol registry |
| `@drawspec/architecture` | C4 model (person, softwareSystem, container, database), relationships, views |
| `@drawspec/uml-sequence` | Sequence diagram authoring API and IR compilation |
| `@drawspec/uml-class` | Class diagrams: classes, interfaces, inheritance, composition |
| `@drawspec/uml-state` | State diagrams: states, transitions, composite states |
| `@drawspec/uml-component` | Component diagrams: components, interfaces, dependencies |
| `@drawspec/uml-deployment` | Deployment diagrams: nodes, artifacts, communication |
| `@drawspec/uml-activity` | Activity diagrams: actions, decisions, partitions |
| `@drawspec/validation` | Rule engine with context and rule packs |
| `@drawspec/layout` | Layout interfaces, sequence layout, graph layout |
| `@drawspec/layout-dagre` | Dagre-based graph layout |
| `@drawspec/layout-elk` | ELK-based graph layout (Eclipse Layout Kernel) |
| `@drawspec/layout-wasm` | WASM layout adapter with TypeScript fallback |
| `@drawspec/renderer-svg` | Deterministic SVG rendering |
| `@drawspec/cache` | Persistent cache (filesystem + SQLite backends) |
| `@drawspec/cli` | CLI binary: check, render, inspect, serve, watch, build:site |
| `@drawspec/viewer` | Framework-neutral `<drawspec-diagram>` web component (Svelte customElement) |
| `@drawspec/testkit` | Test helpers, snapshot utilities, golden test support |
| `@drawspec/lsp` | Language Server Protocol (diagnostics + document symbols) |
| `@drawspec/vite-plugin` | Vite plugin for diagram hot reload |
| `@drawspec/exporter-mermaid` | Mermaid diagram export |
| `@drawspec/exporter-plantuml` | PlantUML diagram export |
| `@drawspec/exporter-d2` | D2 diagram export |
| `@drawspec/docs` | Documentation engine (Doc IR, defineDoc, md tag, HTML renderer) |

## Apps
| App | Purpose |
|-----|---------|
| `@drawspec/preview` | SvelteKit preview app with viewer integration, WebSocket live reload |

## Layout Architecture (Centralized Geometry Pipeline)

`@drawspec/layout` is the single source of truth for all geometry in DrawSpec.

### Geometry Pipeline (all layout engines follow this order):
1. `sizeGraphNodes(document, sizingOptions)` — measures node dimensions, computes `contentLayout` with label positions
2. Layout engine (dagre/elk/wasm/graph) positions nodes and edges
3. `sizeEdgeLabels(edges, options)` — computes edge label positions (midpoint) and wraps text
4. `avoidLabelOverlaps(positionedDiagram)` — shifts overlapping labels, clamps to groups
5. `computeCanvasBounds(diagram, padding)` — computes full bounding box including labels

### Shared Functions (all in `@drawspec/layout`):
- `computeSelfLoopWaypoints(node, offset?)` — self-loop routing
- `computeCanvasBounds(diagram, padding)` — full bounding box with labels
- `sizeEdgeLabels(edges, options)` — edge label positioning and wrapping
- `avoidLabelOverlaps(diagram)` — label overlap avoidance
- `sizeGraphNodes(document, sizingOptions)` — node measurement

### Renderer Trust Model
The SVG renderer (`@drawspec/renderer-svg`) **trusts layout output completely** — no fallback positioning code. If geometry is missing, `LayoutError` is thrown:
- Missing `contentLayout` on node → `LayoutError`
- Missing `labelPosition` on edge with label → `LayoutError`

### Geometry Contract (required fields)
- `PositionedNode`: requires `contentLayout` and `labelLines`
- `PositionedEdge`: requires `labelPosition` and `labelLines`
- `PositionedDiagram`: requires `canvasBounds`

## Key Constraints
- **Deterministic rendering**: Same input → byte-for-byte identical SVG across runs
- **No React** anywhere in the codebase
- **Strict TypeScript** (`"strict": true`)
- **Named exports** only (no `export default`) for all public API
- **TSDoc required** on all public API (enables docs engine API reference generation)

## Status
- Stage 1 MVP complete
- Stage 2 UML Expansion complete (all 7 diagram types)
- Stage 3 tooling: exporters, LSP, vite-plugin, cache, docs engine, preview app
- All packages and apps building, test suite green
