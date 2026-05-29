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

### @drawspec/architecture + @drawspec/validation (Stage 5/6 — Ownership & Policy Packs)
- `ArchitectureElement.owner` accepts `string | OwnerMetadata | undefined` — backward compatible, OwnerMetadata is `{ team?, individual?, escalation? }`
- `ArchitectureElementOptions.owner` mirrors the same union type
- Policy packs live in `@drawspec/validation/src/policy-pack.ts`: `PolicyPack` interface with `name`, `description`, `rules` (RuleConfig overrides)
- Built-in packs: `recommended` (default severities), `strict` (all errors), `relaxed` (all warnings)
- Registry via `registerPolicyPack()` / `loadPolicyPack()` / `listPolicyPacks()` — no external deps
- CLI `drawspec check --policy <name>` merges policy rules on top of recommended, below config rules: `{ ...recommended, ...policyRules, ...config }`
- Child elements (e.g., containers added to a softwareSystem) are in `system.children`, not in `model.elements` — model.elements only contains top-level elements

### @drawspec/architecture — Structurizr & LikeC4 Exporters (Stage 5)
- `exportToStructurizr(workspace)` in `structurizr-exporter.ts`: maps to Structurizr JSON workspace format
  - person→Person, softwareSystem→SoftwareSystem, container→Container, database→Container (with "Database" tag)
  - Structurizr nests containers inside SoftwareSystem objects; relationships are per-element
  - Views: systemContext→SystemContextView, container→ContainerView, with autoLayout rankDirection mapping
- `exportToLikeC4(workspace)` in `likec4-exporter.ts`: maps to LikeC4 model format (flat arrays)
  - person→actor, softwareSystem→system, container→container, database→database
  - IDs are sanitized (replace non-alphanumeric with `_`) for LikeC4 compatibility
  - LikeC4 uses flat `elements[]`, `relations[]`, `views[]` arrays (no nesting)
- Both exporters use `flattenElements()` to recursively collect children from `model.elements`
- `exactOptionalPropertyTypes: true` means optional fields must use conditional spread (`...(x !== undefined ? { x } : {})`) not direct assignment of potentially-undefined values
- Element tags auto-include the kind (e.g., "person", "softwareSystem") and are sorted; exporters filter these out since the target format infers type from the element kind field
- Relationship tags auto-include "relationship"; exporters filter this out
- No external dependencies needed — pure JSON serialization from existing types

### @drawspec/cache — DependencyGraph for Incremental Compilation (Stage 5)
- `DependencyGraph` class in `packages/cache/src/dependency-graph.ts` — tracks import relationships between diagram files
- Dual adjacency lists: `dependencies` (node → what it imports) and `dependents` (node → what imports it)
- `addNode(id, deps)` replaces existing edges — stale edges from previous calls are cleaned up automatically
- `getAffected(id)` returns node + all transitive dependents via iterative BFS; handles cycles safely (visited set)
- `getDependents(id)` returns direct dependents only; `getDependencies(id)` returns direct dependencies only
- `extractImports(source)` uses `source.matchAll()` (not `exec` in a while loop — biome forbids assignment-in-expression) to extract `.ts` import specifiers, skipping `@`-prefixed bare specifiers
- CLI integration: `buildDependencyGraph(files)` reads each file's source, resolves relative imports against the file's directory, only includes matches from the known file set
- `compilePreviewIncremental()` reuses previous `PreviewPayload` for unaffected files — skips layout/render for diagrams whose source file wasn't in the affected set
- `watchFiles` callback signature changed from `() => void` to `(file: string) => void` — uses per-file closure to identify the changed file
- `debounceArg<T>` replaces `debounce` for typed argument passthrough — remembers last argument across rapid fires
- When adding new files to `@drawspec/cache`, must run `bun run build` (tsc) to update `dist/` before dependent packages can import them
- Biome rules: no non-null assertions (`stack.pop()!` → check for undefined), prefer optional chaining (`specifier?.endsWith()`), no assignment in expressions (use `matchAll` instead of `exec` loop)

### @drawspec/architecture — Drift Detection (Stage 6)
- `snapshotModel(workspace)` returns a plain serializable `ModelSnapshot` with flattened child elements and relationship endpoints as IDs; no live model references are retained.
- `compareSnapshots(before, after)` treats `after`-only IDs as `added`, `before`-only IDs as `removed`, and shared IDs with field-level differences as `modified`.
- Element diffs cover `kind`, `name`, `description`, `technology`, `tags`, `parentId`, `properties`, and `owner`; relationship diffs cover endpoints, label, protocol/direction, tags, and metadata.
- `detectDrift(model, codeMetadata)` compares architecture IDs against explicit code metadata IDs; missing-in-code becomes `removed`, code-only becomes `added`, and provided metadata fields are compared without requiring code metadata to mirror every model field.
- `generateDriftReport()` emits Markdown suitable for CLI output or PR comments with Added/Removed/Modified element sections and a combined Relationship Changes section.

### DrawSpec Benchmarks (Task 34)
- Bun benchmark files use local `bench()` wrappers backed by `bun:test` under `packages/*/src/__bench__`; package `tsconfig.json` excludes `__bench__` so benchmark-only cross-package imports do not leak into production builds. Bun 1.3.14 does not export `bench` and still discovers benchmark modules through `.test.ts` wrappers, so `*.bench.test.ts` imports the `*.bench.ts` definitions only when `DRAWSPEC_RUN_BENCH=1`.
- Core benchmark fixtures generate deterministic diagrams at 1, 10, 100, and 1000 diagram scales plus 1000/10000-element compile workloads; layout benchmarks cover 10/100/1000/10000-element graphs and a 50-participant/500-message sequence.
- `bun run bench` runs `bun test --bench packages/core/src/__bench__ packages/layout/src/__bench__`; baselines live in `benchmarks/baseline.json` and are non-gating.

### @drawspec/architecture — ADR Integration (Stage 6)
- Architecture Decision Records are model metadata on `Workspace.decisions`, not filesystem files; no markdown frontmatter parsing/storage.
- `ArchitectureDecisionRecord` links to elements by stable `elementIds`; `ArchitectureElement.decisions` is optional reference metadata for element-authored ADR IDs.
- ADR helpers in `packages/architecture/src/adr.ts` are pure and immutable: `linkAdrToElement()` returns a copied ADR and does not mutate workspace state.
- `getElementAdrs()` resolves nested C4 elements recursively, matching ADRs by `elementIds` and optional element `decisions` references.
- `generateAdrReport()` and `exportAdrJson()` sort ADRs by ID for deterministic output.

### @drawspec/architecture — Service Catalog Hooks (Stage 6)
- Service catalog extraction lives in `packages/architecture/src/service-catalog.ts` and flattens nested architecture elements before filtering service-like entries.
- Current architecture types expose `softwareSystem` rather than `system`; catalog extraction treats `softwareSystem`, `system`, `container`, `service`, and any element tagged `service` as service-like for forward compatibility.
- Catalog dependencies are derived from outgoing `ArchitectureRelationship.source.id -> target.id` edges and sorted for deterministic JSON/YAML output.
- Backstage YAML is generated manually (no YAML dependency) as one `Component` document per catalog entry, with `softwareSystem` exported as Backstage `spec.type: service`.

### @drawspec/architecture — Dynamic View Generation (Task 38)
- `generateViews(model, options)` lives in `packages/architecture/src/view-generator.ts` and returns existing `ArchitectureView`-compatible objects augmented with deterministic `elements` and `relationships` ID arrays.
- Tag strategy is OR-based across requested tags; kind strategy accepts current C4 kinds plus forward-compatible `component`, and both include only relationships whose endpoints are in the generated element set.
- Path strategy resolves seeds by element ID or element name, then performs deterministic BFS over relationships (`forward` by default, with `reverse`/`both` options) up to `maxDepth`.
- Auto strategy creates a `system-landscape` view for top-level software systems and one per top-level software system containing the system and its direct children.
- `compileWorkspace()` now falls back to auto-generated views only when `workspace.views.items` is empty; generated relationship ID lists are honored during compilation.

## 2026-05-21 — Final MVP Verification Complete

### Definition of Done — ALL PASS
- `bun install --frozen-lockfile` ✅
- `bun run check` (biome + typecheck + 562 tests) ✅
- `bun run build` — all 10+ packages build ✅
- `drawspec check fixtures/mvp/` — zero diagnostics ✅
- `drawspec render fixtures/mvp/ --out /tmp/ds-out` — 4 valid SVGs ✅
- Rendering deterministic (byte-identical across runs) ✅
- `drawspec serve fixtures/mvp/` — browser preview works ✅
- 87.38% line coverage overall (≥80% target) ✅

### Task 13 final fixes
- Fixed remaining floating-node warnings by integrating OIDC Provider into main workspace with relationships
- Reorganized architecture-nested.arch.ts: inlined the previously-separate `identity` workspace directly into the commerce workspace, eliminating the unused-import OIDC Provider / Identity warnings
- All 3 MVP fixtures now pass `drawspec check` with zero diagnostics
- Invalid fixtures in `fixtures/edge-cases/` produce expected violations (error + warning)
- Biome import ordering fixed in mvp.test.ts
