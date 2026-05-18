# DrawSpec — Project Overview

## What
TypeScript-native diagram-as-code platform. Diagrams written as TypeScript using builder APIs, compiled to IR, laid out, and rendered to deterministic SVGs.

## Architecture
- **Monorepo** with Bun workspaces, 9 packages under `packages/`
- **Runtime**: Bun-only (no Node.js)
- **Build**: TypeScript project references, `tsc -b`
- **Linting**: Biome (not ESLint)
- **Testing**: `bun test` (not Vitest/Jest)
- **CI**: GitHub Actions (`.github/workflows/ci.yml`)
- **Pre-commit**: lefthook + biome (`--staged` mode)

## Packages
| Package | Purpose |
|---------|---------|
| `@drawspec/core` | IR types, diagnostics, deterministic IDs, builders, symbol registry |
| `@drawspec/uml-sequence` | Sequence diagram authoring API and IR compilation |
| `@drawspec/architecture` | C4 model (person, softwareSystem, container, database), relationships, views |
| `@drawspec/validation` | Rule engine with context and rule packs |
| `@drawspec/layout` | Layout interfaces, sequence layout, graph layout |
| `@drawspec/renderer-svg` | Deterministic SVG rendering |
| `@drawspec/cli` | CLI binary `drawspec` with check, render, inspect, watch, serve commands |
| `@drawspec/viewer` | Framework-neutral `<drawspec-diagram>` web component (Svelte customElement) |
| `@drawspec/testkit` | Test helpers, snapshot utilities, golden test support |

## Key Constraints
- **Deterministic rendering**: Same input → byte-for-byte identical SVG across runs
- **No Math.random/Date.now** in rendering code
- **No React, no SvelteKit** in pure TS packages
- **Strict TypeScript** (`"strict": true`)
- **Export** (not `export default`) for all public API

## Status
- Stage 1 MVP complete (13 tasks, 133 tests, 9/9 packages building)
- Stage 2 (UML Expansion) next: class, state, component, deployment, activity diagrams
