## DrawSpec Platform — Learnings & Conventions

### Project Conventions
- Bun-only runtime and build tooling (no Node.js)
- SvelteKit with adapter-bun for preview app
- Viewer: Svelte customElement → Web Components (framework-neutral)
- Deterministic rendering: byte-for-byte identical SVGs
- Monorepo with `cog.toml` + `tsconfig.json` project references across 22 packages
- Conventional commits via cocogitto (`cog verify`)
- Lefthook for commit hooks; may need `-c core.hooksPath=/dev/null` for non-standard commits
- `bun.lock` conflict markers require `rm bun.lock && bun install` to regenerate

### Architecture
- Core IR types in @drawspec/core with deterministic IDs
- Architecture (C4 model) in @drawspec/architecture
- UML diagram types: sequence, class, state, component, activity, deployment
- Layout engines in @drawspec/layout (interface), @drawspec/layout-dagre, @drawspec/layout-elk
- SVG renderer in @drawspec/renderer-svg
- CLI in @drawspec/cli (check, render, inspect, watch, serve, build:site)
- Viewer as Svelte web component in @drawspec/viewer
- Exporters: mermaid, plantuml, d2
- LSP in @drawspec/lsp
- Vite plugin in @drawspec/vite-plugin
- VS Code extension in extensions/vscode/
- Validation in @drawspec/validation with rule engine
- Cache in @drawspec/cache — persistent filesystem (JSON) and optional SQLite cache for compiled IR/SVGs; uses Bun.hash for deterministic keys

### Known Issues
- `Bun.file(path).exists()` returns `false` for directories — use `existsSync` from `node:fs` for directory checks in CLI
- CLI discovery: the `discoverFiles` function in `packages/cli/src/index.ts` uses `existsSync` (not `Bun.file().exists()`) to detect directories for glob scanning

### Package Dependency Order (build)
core → (architecture, validation, uml-sequence, uml-class, uml-state, uml-component, uml-activity, uml-deployment) → layout → (layout-dagre, layout-elk) → renderer-svg → cache → cli → viewer → (exporter-mermaid, exporter-plantuml, exporter-d2, vite-plugin, testkit, lsp, vscode)

### New Package Setup Learnings
- Packages using `node:fs` or `node:path` need `"types": ["node"]` in tsconfig `compilerOptions` to resolve `@types/node` from root
- `bun:sqlite` needs a local `.d.ts` declaration file since `bun-types` is not installed; declare module and types inline
- `require("bun:sqlite")` needs `@typescript-eslint/no-require-imports` suppression or extraction into a helper function
- `exactOptionalPropertyTypes: true` in root tsconfig means optional fields with `string | undefined` values must be spread conditionally (`...(x !== undefined ? { x } : {})`)
- CLI's `Bun` type is declared inline in `src/index.ts`, not via `@types/bun`
- `Bun.hash(input)` returns a `number` — cast with `as number` for `.toString()` calls

### @drawspec/architecture Query API (Stage 5)
- `model.elements` only contains top-level elements; children (containers/databases inside software systems) are nested via `element.children` — query API must flatten recursively
- `element.tags` always includes the element kind as the first tag (e.g., `["person", ...userTags]`) — tag is auto-sorted and deduplicated
- `relationship.tags` always includes `"relationship"` as the first tag — same auto-sort/dedup pattern
- Relationships reference child elements directly (e.g., `source` can be a container, not just a top-level element)
- `createQuery(model)` returns a `WorkspaceQuery` object — standalone function, not a method on Workspace (consumer, not modifier)
- Tag filtering supports negation via `!` prefix (e.g., `tags: ["!external"]` excludes elements with that tag)
- Path finding uses BFS with configurable direction (`forward`, `reverse`, `both`) and `maxDepth` (default 20)

### @drawspec/layout-wasm (Stage 5)
- WASM layout adapter with `WasmBridge` interface for plugging in WASM binaries
- `TypeScriptFallbackBridge` provides deterministic layered layout (topological ranking + barycenter ordering)
- Engine naming: `wasm:{bridge.name}` — allows multiple bridge backends
- Uses same `LayoutCache` and `normalizeLayoutOptions` as dagre/elk adapters
- `WasmGraphInput` serializes graph to plain objects (no class instances) for WASM compatibility
- No `Math.random()` or `Date.now()` — all sorting is alphabetical by ID, barycenter uses deterministic arithmetic
- For chain graphs (all nodes at different ranks), spacing.node doesn't affect width in TB direction — only spacing.rank affects height
