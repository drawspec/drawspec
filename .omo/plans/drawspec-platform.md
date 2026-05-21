# DrawSpec Platform — Staged Work Plan

## TL;DR

> **Quick Summary**: Build DrawSpec, a TypeScript-native diagram-as-code and architecture-as-code platform. Monorepo with 9 MVP packages, SvelteKit preview/docs, framework-neutral viewer, deterministic SVG rendering, and full staged roadmap through advanced architecture features.
> 
> **Deliverables**:
> - Complete monorepo scaffold with Bun workspaces + Biome + TypeScript project references
> - @drawspec/core with Diagram IR, diagnostics, deterministic IDs
> - @drawspec/uml-sequence with participants, messages, alt/else, notes
> - @drawspec/architecture with C4 model (person, softwareSystem, container, database), relationships, context + container views
> - @drawspec/validation with rule engine and initial rule packs
> - @drawspec/layout with interfaces, sequence layout, simple graph layout
> - @drawspec/renderer-svg with deterministic SVG output
> - @drawspec/cli with check, render, inspect, watch, serve commands
> - @drawspec/viewer with framework-neutral web components (Svelte → customElement)
> - @drawspec/testkit with test helpers, snapshot utilities, golden test support
> - Example fixtures, golden SVG files, CI pipeline, and documentation
> - Post-MVP stages: UML expansion, exporters, editor integration, performance, advanced architecture
> 
> **Estimated Effort**: XL (6 stages, ~40 tasks)
> **Parallel Execution**: YES — 8 waves in Stage 1 alone, then staged gates
> **Critical Path**: Core IR → Sequence/Architecture → Layout → SVG Renderer → CLI → Viewer

---

## Context

### Original Request
Build DrawSpec — a TypeScript-native diagram-as-code platform covering PlantUML-like diagram breadth with LikeC4-style architecture semantics. Author diagrams as TypeScript modules. Render to SVG. Validate in CI. Preview locally.

### Interview Summary
**Key Discussions**:
- Runtime: Strict Bun-only (including build tooling via adapter-bun)
- UI: Framework-neutral viewer via Svelte → Web Components; SvelteKit for preview app + docs
- Testing: Bun test only, TDD workflow, golden tests, deterministic snapshots
- C4 vocabulary embraced directly (person, softwareSystem, container, component, etc.)
- IDs: Optional with auto-generated fallback, deterministic
- Rendering: Byte-for-byte deterministic across machines
- Static site gen: First-party, post-MVP (Stage 3)
- Nested workspaces: Supported from architecture package

**Research Findings**:
- Repo is greenfield (only spec.md exists)
- Spec is comprehensive (2313 lines) with detailed IR shapes, API examples, package responsibilities
- SvelteKit supports Bun via @sveltejs/adapter-bun
- Svelte customElement mode compiles components to Web Components for framework-neutral use

### Metis Review
**Identified Gaps** (addressed):
- Stage 1 too large → Split into 8 sub-gates (1A through 1H)
- React/SvelteKit spec mismatch → Fully resolved: Svelte + framework-neutral web components
- Missing MVP diagram feature specificity → Defined: core sequence features, core C4 + 2 views
- Missing package dependency graph → Explicitly defined in Execution Strategy
- Bun + SvelteKit build compatibility → Strict Bun via adapter-bun, `bun --bun vite dev`
- Viewer embeddability → Framework-neutral via Svelte customElement from start

---

## Work Objectives

### Core Objective
Build a complete TypeScript-native diagram-as-code platform where teams author architecture models and UML-style diagrams as TypeScript modules, validate them in CI, preview locally with low latency, and render stable deterministic SVGs for documentation.

### Concrete Deliverables
- 9 published npm packages under @drawspec/*
- CLI binary `drawspec` (aliases `ds`, `dspec`)
- Framework-neutral `<drawspec-diagram>` web component
- Deterministic SVG rendering pipeline
- Validation rule engine with initial rule packs
- Example fixtures demonstrating all MVP features
- CI-ready pipeline (check + render + test)

### Definition of Done
- [ ] `bun install --frozen-lockfile` succeeds
- [ ] `bun run check` (biome + typecheck + test) passes with zero errors
- [ ] `bun run build` produces all 9 packages
- [ ] `drawspec check fixtures/mvp/` reports zero diagnostics
- [ ] `drawspec render fixtures/mvp/ --out /tmp/ds-out` produces valid SVGs
- [ ] Rendering is deterministic: two runs produce byte-identical SVGs
- [ ] `drawspec serve fixtures/mvp/` opens browser with working preview
- [ ] All packages have ≥80% line coverage on core logic

### Must Have
- TypeScript authoring API for sequence diagrams and C4 architecture
- Deterministic SVG rendering (byte-for-byte)
- CLI commands: check, render, inspect, watch, serve
- Framework-neutral viewer web component
- Validation rule engine with architecture + diagram rules
- Bun test infrastructure with golden tests and snapshots
- Example fixtures covering happy-path and edge cases
- Biome formatting and linting
- TypeScript project references for all packages
- GitHub repo at `https://github.com/drawspec/drawspec` (drawspec org)
- Kanban board at `https://github.com/orgs/drawspec/projects/1` for task tracking
- `AGENTS.md` file documenting project conventions, commit rules, and PR workflow
- GitHub Actions CI with proper checks (biome, typecheck, test, build)
- Branch protection on `main` requiring CI pass before merge
- PR-based workflow: self-contained PRs squashed to `main`
- Conventional commits (atomic, one concern per commit)
- Every PR references a project ticket or repo issue

### Must NOT Have (Guardrails)
- NO React anywhere in the codebase
- NO SvelteKit imports in pure TS packages (core, architecture, sequence, validation, layout, renderer-svg, testkit)
- NO Node.js dependency at runtime or build time (strict Bun)
- NO Mermaid, PlantUML, D2 exporters in MVP (Stage 3+)
- NO LSP or VS Code extension in MVP (Stage 4+)
- NO WASM layout engine in MVP (Stage 5+)
- NO JSON authoring mode in MVP (design for it only)
- NO Windows support in MVP (macOS + Linux only)
- NO hosted/SaaS/collaboration features
- NO GUI diagram editor
- NO AI diagram generation
- NO .puml source format support
- NO PNG export (SVG only for MVP)
- NO perfect layout guarantee
- NO service catalog / ADR / drift detection in MVP (Stage 6+)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield — will be set up in Task 1)
- **Automated tests**: YES (TDD — tests first where practical, golden tests for SVG)
- **Framework**: Bun test
- **TDD approach**: Core logic tests first, golden SVG fixtures for renderer, CLI integration tests

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Core/Library**: Use Bash (bun test) — run tests, assert pass/fail
- **CLI**: Use Bash — run `drawspec` commands, parse output, assert exit codes
- **SVG Renderer**: Use Bash — render SVG, compare golden files with `cmp`
- **Viewer/UI**: Use Playwright — open preview, assert DOM, screenshot
- **Determinism**: Use Bash — render twice, `cmp` output files

---

## Execution Strategy

### Stage Overview

```
STAGE 1: MVP (8 sub-gates, ~30 tasks)
  Gate 1A: Monorepo scaffold + tooling
  Gate 1B: Core IR + diagnostics
  Gate 1C: Sequence diagram vertical slice
  Gate 1D: Architecture model vertical slice
  Gate 1E: Validation engine + rules
  Gate 1F: CLI (check, render, inspect)
  Gate 1G: Watch + serve + viewer
  Gate 1H: Testkit + fixtures + CI
  → GATE: Full MVP functional

STAGE 2: UML Expansion (~8 tasks)
  Class diagrams, State diagrams, Component diagrams, Deployment diagrams,
  Limited Activity diagrams, more validation rules, more layout strategies
  → GATE: Full UML coverage

STAGE 3: Exporters & Docs Ecosystem (~8 tasks)
  Mermaid exporter, PlantUML exporter, D2 exporter, JSON exporter stabilization,
  Vite plugin, static site generation (drawspec build:site)
  → GATE: Export + docs ecosystem functional

STAGE 4: Editor Integration (~6 tasks)
  VS Code extension, LSP augmentation, preview panel, diagnostics, model explorer
  → GATE: Editor integration usable

STAGE 5: Performance & Scale (~6 tasks)
  Persistent cache, incremental compile, dependency graph, workspace query API,
  performance benchmarks, large architecture explorer, WASM layout adapter
  → GATE: Performance targets met

STAGE 6: Advanced Architecture (~6 tasks)
  Dynamic views, ADR integration, drift detection, ownership metadata,
  service catalog integration, policy packs
  → GATE: Advanced features complete
```

### Package Dependency Graph

```
core ← (no internal deps)
  ↑
validation ← core
  ↑
architecture ← core, validation
uml-sequence ← core, validation
  ↑
layout ← core
  ↑
renderer-svg ← core, layout
  ↑
cli ← core, architecture, uml-sequence, validation, layout, renderer-svg
  ↑
viewer ← core, renderer-svg (via artifacts/IR, not direct imports)
  ↑
testkit ← core, validation
```

**Guardrails**:
- `core` depends on NOTHING internal
- `validation` depends on `core` only
- Domain packages (architecture, sequence) depend on `core` + optionally `validation`
- `layout` depends on `core`, NOT on domain packages
- `renderer-svg` depends on `core` + `layout`
- `cli` orchestrates everything, no package depends on `cli`
- `viewer` consumes IR/layout artifacts, does NOT import domain packages directly
- No circular dependencies — enforced by TypeScript project references

---

## TODOs

> Tasks are organized by stage and gate. Each stage is a gated boundary.
> Execute stages sequentially. Within each gate, maximize parallelism.
> EVERY task has: Agent Profile + Parallelization + QA Scenarios.

---

## STAGE 1: MVP

---

## Gate 1A: Monorepo Scaffold + Tooling

- [x] 1. Initialize monorepo with Bun workspaces, Biome, TypeScript, and git

  **What to do**:
  - `git init` and connect to `https://github.com/drawspec/drawspec` (drawspec org)
  - Create root `package.json` with Bun workspaces (`packages/*`, `apps/*`)
  - Configure Biome with recommended rules (formatting + linting)
  - Create root `tsconfig.json` with project references
  - Create `.gitignore` (node_modules, dist, .ds-out, .sisyphus/evidence)
  - Create `bunfig.toml` for Bun configuration
  - Create `biome.json` with TypeScript + Svelte file support
  - Add changeset config for versioning
  - Create `AGENTS.md` documenting:
    - Project overview and tech stack (Bun, TypeScript, Biome, SvelteKit)
    - Package structure and dependency rules
    - Commit conventions (conventional commits, atomic, one concern per commit)
    - PR workflow (feature branch → PR → CI → squash merge to main)
    - PR-ticket linking rules (must reference kanban ticket or repo issue)
    - CI requirements (biome check, typecheck, test must pass)
    - Testing conventions (Bun test, golden tests, snapshot policy)
    - Branch naming: `feat/{scope}-{desc}`, `fix/{scope}-{desc}`
  - Configure branch protection on `main` (require CI pass, squash merge only)
  - Verify: `bun install` succeeds, `biome check .` passes

  **Must NOT do**: Create any package source files (just scaffolding)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation for everything)
  - **Parallel Group**: Sequential — Gate 1A start
  - **Blocks**: All other tasks
  - **Blocked By**: None

  **References**:
  - `spec.md` lines 857-908 — Repository setup, root package.json, tsconfig
  - `spec.md` lines 2220-2228 — Week 1: core skeleton description

  **Acceptance Criteria**:
  - [ ] `bun install` succeeds with zero errors
  - [ ] `biome check .` passes (no files to check is OK)
  - [ ] `git remote -v` shows `origin https://github.com/drawspec/drawspec`
  - [ ] Root `tsconfig.json` exists with project references section
  - [ ] `AGENTS.md` exists with project conventions, commit rules, and PR workflow
  - [ ] Branch protection configured on `main` (CI required, squash merge only)

  **QA Scenarios**:
  ```
  Scenario: Monorepo is correctly initialized
    Tool: Bash
    Steps:
      1. Run `bun install` → exit code 0
      2. Run `biome check .` → exit code 0
      3. Run `git remote -v` → contains "drawspec/drawspec"
      4. Run `cat package.json | jq .workspaces` → `["packages/*", "apps/*"]`
      5. Run `cat tsconfig.json | jq .references` → array exists (may be empty initially)
    Expected Result: All commands succeed, workspaces configured
    Evidence: .sisyphus/evidence/task-1-monorepo-init.txt

  Scenario: AGENTS.md documents conventions
    Tool: Bash
    Steps:
      1. Run `cat AGENTS.md` → file exists and is non-empty
      2. Assert: contains "conventional commits" section
      3. Assert: contains "PR workflow" section
      4. Assert: contains "kanban board" reference
      5. Assert: contains branch naming conventions
    Expected Result: AGENTS.md is comprehensive and actionable
    Evidence: .sisyphus/evidence/task-1-agents-md.txt
  ```

  **Commit**: YES
  - Message: `chore(repo): initialize monorepo with bun, biome, typescript, and AGENTS.md`
  - Files: `package.json, tsconfig.json, biome.json, .gitignore, bunfig.toml, AGENTS.md`

- [x] 2. Create all 9 package skeletons with TypeScript project references

  **What to do**:
  - Create package directories under `packages/`:
    - `core`, `architecture`, `uml-sequence`, `validation`, `layout`, `renderer-svg`, `cli`, `viewer`, `testkit`
  - Each package gets:
    - `package.json` with name (`@drawspec/{name}`), version `0.0.1`, type `module`, exports map
    - `tsconfig.json` extending root config with `composite: true`, outDir, rootDir
    - `src/index.ts` with a placeholder export
    - `BUILD.md` documenting the package's responsibility
  - Create `apps/preview/` directory placeholder for SvelteKit preview app
  - Update root `tsconfig.json` references to include all packages
  - Verify: `bun install` resolves all workspaces, `tsc -b` passes

  **Must NOT do**: Implement any business logic (just `export {}` placeholders)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Gate 1A
  - **Blocks**: Tasks 4+ (all implementation tasks)
  - **Blocked By**: Task 1

  **References**:
  - `spec.md` lines 657-692 — Package architecture layout
  - `spec.md` lines 893-908 — TypeScript project references config
  - `spec.md` lines 694-710 — @drawspec/core responsibilities
  - `spec.md` lines 710-728 — @drawspec/architecture responsibilities

  **Acceptance Criteria**:
  - [ ] All 9 package directories exist under `packages/`
  - [ ] Each has `package.json`, `tsconfig.json`, `src/index.ts`
  - [ ] `bun install` succeeds
  - [ ] `tsc -b` passes (no errors)
  - [ ] Root tsconfig references all 9 packages

  **QA Scenarios**:
  ```
  Scenario: All package skeletons are valid
    Tool: Bash
    Steps:
      1. Run `ls packages/` → shows 9 directories
      2. For each package, run `cat packages/{name}/package.json | jq .name` → starts with "@drawspec/"
      3. Run `bun install` → exit code 0
      4. Run `tsc -b` → exit code 0
    Expected Result: 9 packages discoverable, TypeScript compiles
    Evidence: .sisyphus/evidence/task-2-package-skeletons.txt
  ```

  **Commit**: YES (groups with Task 1 if sequential)
  - Message: `chore: create 9 package skeletons with typescript project references`
  - Files: `packages/*/package.json, packages/*/tsconfig.json, packages/*/src/index.ts, tsconfig.json`

- [x] 3. Set up shared dev dependencies, scripts, and CI foundation

  **What to do**:
  - Add root `devDependencies`: `@biomejs/biome`, `typescript`, `@changesets/cli`
  - Add root `scripts`: `check`, `format`, `lint`, `typecheck`, `test`, `build`, `changeset`, `release`
  - Create `.github/workflows/ci.yml` — **proper GitHub Actions CI**:
    - Trigger: push to main, pull_request to main
    - Jobs: `check` (biome check), `typecheck` (tsc -b), `test` (bun test), `build` (bun run build)
    - Each job runs independently for fast feedback
    - All jobs must pass before PR can merge (branch protection)
    - Use `oven-sh/setup-bun@v2` for Bun setup
    - Cache bun install with `actions/cache`
  - Create `.github/workflows/release.yml` placeholder (changeset-based)
  - Verify: `bun run check` works locally, CI workflow is valid YAML

  **Must NOT do**: Add any test files yet (just the CI infrastructure). No direct push to main — branch protection handles that.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Gate 1A
  - **Blocks**: Tasks 4+ (CI must exist for PRs)
  - **Blocked By**: Task 1

  **References**:
  - `spec.md` lines 862-888 — Root package.json scripts and dependencies
  - `spec.md` lines 2170-2178 — CI validation workflow

  **Acceptance Criteria**:
  - [ ] `bun run check` succeeds (biome + typecheck + test — empty test suite is OK)
  - [ ] `bun run build` succeeds (no-ops on empty packages)
  - [ ] `.github/workflows/ci.yml` exists and is valid YAML
  - [ ] All scripts in package.json are functional

  **QA Scenarios**:
  ```
  Scenario: CI infrastructure works
    Tool: Bash
    Steps:
      1. Run `bun run check` → exit code 0
      2. Run `bun run build` → exit code 0
      3. Run `cat .github/workflows/ci.yml | yq .` → valid YAML parsed
    Expected Result: All scripts pass, CI YAML is valid
    Evidence: .sisyphus/evidence/task-3-ci-foundation.txt
  ```

  **Commit**: YES
  - Message: `ci(repo): add GitHub Actions CI pipeline with check, typecheck, test, build`
  - Files: `package.json, .github/workflows/ci.yml`

- [x] 4. Implement @drawspec/core — Diagram IR types, diagnostics, and deterministic IDs

  **What to do**:
  - Define `DiagramDocument` interface (schemaVersion, id, title, kind, nodes, edges, groups, annotations, layout, styles, metadata, diagnostics)
  - Define `DiagramKind` union type (architecture, sequence, class, component, deployment, state, activity, use-case, object, timing, er, graph)
  - Define `DiagramNode` interface (id, kind, label, description, parentId, tags, metadata, style, source)
  - Define `DiagramEdge` interface (id, kind, sourceId, targetId, label, direction, tags, metadata, style, source)
  - Define `DiagramGroup` and `DiagramAnnotation` interfaces
  - Define `Diagnostic` interface (code, severity, message, source, target, help)
  - Define `SourceRef` interface (file, line, column, symbol)
  - Define `LayoutSpec`, `StyleSheet`, `StyleRef` types
  - Implement deterministic ID generation: content-hash-based, same input → same ID
  - Implement ID registry that tracks IDs and detects collisions
  - Implement serialization to JSON with stable key ordering
  - Add comprehensive unit tests for all types and ID generation
  - Ensure ALL exported types are strict (no `any`)

  **Must NOT do**: Import from any other @drawspec package. Depend on layout or rendering logic.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation for all domain packages)
  - **Parallel Group**: Sequential — Gate 1B
  - **Blocks**: Tasks 5, 6, 7, 8, 9, 10, 11 (everything depends on core types)
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  **Pattern References**:
  - `spec.md` lines 546-655 — Complete Diagram IR specification (DiagramDocument, DiagramNode, DiagramEdge, SourceRef, etc.)
  - `spec.md` lines 1126-1138 — Diagnostic shape
  - `spec.md` lines 694-710 — @drawspec/core responsibilities

  **API/Type References**:
  - `spec.md` lines 566-579 — DiagramDocument interface shape
  - `spec.md` lines 586-598 — DiagramKind union
  - `spec.md` lines 604-615 — DiagramNode interface
  - `spec.md` lines 619-633 — DiagramEdge interface
  - `spec.md` lines 649-655 — SourceRef interface

  **Acceptance Criteria**:
  - [ ] `bun test packages/core` passes with ≥10 test cases
  - [ ] All IR types are exported from `@drawspec/core`
  - [ ] Deterministic ID: `generateId({name: "API", scope: "payments"})` returns same value every run
  - [ ] ID collision detection works
  - [ ] JSON serialization is stable (same object → same JSON string)
  - [ ] `tsc --noEmit` passes with zero errors in core package

  **QA Scenarios**:
  ```
  Scenario: Deterministic ID generation
    Tool: Bash (bun test)
    Steps:
      1. Run `bun test packages/core --test-name-pattern "deterministic"`
      2. Assert: generateId called with same input produces same output across 100 calls
      3. Assert: different inputs produce different IDs
    Expected Result: All ID determinism tests pass
    Evidence: .sisyphus/evidence/task-4-deterministic-ids.txt

  Scenario: ID collision detection
    Tool: Bash (bun test)
    Steps:
      1. Run `bun test packages/core --test-name-pattern "collision"`
      2. Assert: registering duplicate ID throws/reports diagnostic
      3. Assert: unique IDs register without error
    Expected Result: Collision detection works correctly
    Evidence: .sisyphus/evidence/task-4-id-collisions.txt

  Scenario: JSON serialization is stable
    Tool: Bash (bun test)
    Steps:
      1. Create a DiagramDocument with known values
      2. Serialize to JSON twice
      3. Assert: both serializations are byte-identical
    Expected Result: Stable JSON output
    Evidence: .sisyphus/evidence/task-4-stable-json.txt
  ```

  **Commit**: YES
  - Message: `feat(core): implement diagram IR types, diagnostics, and deterministic IDs`
  - Files: `packages/core/src/**`

- [x] 5. Implement @drawspec/core — Builder primitives and symbol registry

  **What to do**:
  - Create builder factory pattern: `createBuilder<T>()` for typed element construction
  - Implement element builder base: chainable API for setting label, description, tags, metadata, style
  - Implement relationship builder: source, target, label, direction, tags
  - Implement symbol registry: maps element names → IDs within a scope
  - Implement scope management: nested scopes for containers, packages, etc.
  - Add unit tests for all builder primitives
  - Ensure builder APIs match spec examples (see spec Section 6 authoring examples)

  **Must NOT do**: Depend on any specific diagram type. These are generic primitives.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 4 types)
  - **Parallel Group**: Sequential — Gate 1B
  - **Blocks**: Tasks 6, 7 (domain packages need builders)
  - **Blocked By**: Task 4

  **References**:
  - `spec.md` lines 1576-1630 — API design guidelines (typed builders, stable IDs, composition, escape hatches)
  - `spec.md` lines 466-472 — Relationship model with options
  - `spec.md` lines 1596-1603 — ID stability examples

  **Acceptance Criteria**:
  - [ ] `bun test packages/core` passes with builder-specific test cases
  - [ ] Builder API produces valid DiagramNode/DiagramEdge objects
  - [ ] Symbol registry resolves names to IDs correctly
  - [ ] Nested scopes work (child elements inherit parent scope)

  **QA Scenarios**:
  ```
  Scenario: Builder produces valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create element via builder: `createElement("API", { technology: "TypeScript" })`
      2. Assert: result has valid id, label "API", metadata.technology "TypeScript"
      3. Create relationship via builder: `createRel(source, target, "calls")`
      4. Assert: result has valid id, correct sourceId/targetId, label "calls"
    Expected Result: Builders produce valid IR objects
    Evidence: .sisyphus/evidence/task-5-builders.txt
  ```

  **Commit**: YES
  - Message: `feat(core): implement builder primitives and symbol registry`
  - Files: `packages/core/src/**`

---

## Gate 1C: Sequence Diagram Vertical Slice

---

## Gate 1D: Architecture Model Vertical Slice

> Gates 1C and 1D can run in PARALLEL. Both depend on Gate 1B (core).
> Neither depends on the other.

---

- [x] 6. Implement @drawspec/uml-sequence — Authoring API, domain model, and IR compilation

  **What to do**:
  - Define sequence-specific types: `SequenceParticipant`, `SequenceActor`, `SequenceMessage`, `SequenceFragment`
  - Implement `sequence()` factory function matching spec example (Section 6.2):
    - `actor(name)` → creates lifeline participant of kind "actor"
    - `participant(name)` → creates lifeline participant of kind "participant"
    - Support for `alt()`/`else()` fragments (core MVP feature)
    - Support for notes attached to participants/messages
  - Implement message types: `participant.to(other, "label")` for synchronous messages
  - Implement fragment builder: `alt("condition", callback).else("condition", callback)`
  - Compile sequence domain model → `DiagramDocument` (IR) with kind="sequence"
  - Sequence nodes map to lifeline headers + activation bars
  - Sequence edges map to messages (solid arrows) and responses (dashed arrows)
  - Sequence groups map to fragments (alt boxes)
  - Add unit tests matching spec examples (payment authorization, alt/else control flow)
  - Add compilation tests: domain model → IR → verify node/edge counts and properties

  **Must NOT do**: Implement rendering (SVG) or layout. Just compile to IR.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7 — architecture model)
  - **Parallel Group**: Gate 1C
  - **Blocks**: Task 10 (sequence layout), Task 13 (CLI sequence rendering)
  - **Blocked By**: Tasks 4, 5

  **References**:
  **Pattern References**:
  - `spec.md` lines 300-341 — Sequence diagram examples (basic + alt/else)
  - `spec.md` lines 745-762 — UML package responsibilities
  - `spec.md` lines 1393-1409 — Builder test example for sequence

  **API/Type References**:
  - `spec.md` lines 304-317 — `sequence()` API: actor, participant, .to()
  - `spec.md` lines 325-341 — `alt()`/`.else()` control flow API
  - `spec.md` lines 1201-1209 — Sequence validation rules (for later reference)

  **Acceptance Criteria**:
  - [ ] `bun test packages/uml-sequence` passes with ≥8 tests
  - [ ] Can create the "Payment authorization" example from spec Section 6.2
  - [ ] Can create the alt/else example from spec Section 6.3
  - [ ] Compiling a sequence diagram produces a valid DiagramDocument with kind="sequence"
  - [ ] IR contains correct number of nodes (participants + actors) and edges (messages)

  **QA Scenarios**:
  ```
  Scenario: Basic sequence compiles to valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create spec's "Payment authorization" example (6 messages, 4 participants)
      2. Compile to IR
      3. Assert: 4 nodes (User, Web App, API, Bank)
      4. Assert: 6 edges with correct labels and source/target ordering
    Expected Result: IR matches expected structure
    Evidence: .sisyphus/evidence/task-6-sequence-basic.txt

  Scenario: Alt/else fragment compiles correctly
    Tool: Bash (bun test)
    Steps:
      1. Create spec's alt/else example from Section 6.3
      2. Compile to IR
      3. Assert: 2 groups (alt fragment with "Approved" and "Declined" sections)
      4. Assert: edges grouped correctly within fragments
    Expected Result: Alt/else fragments compile to DiagramGroups
    Evidence: .sisyphus/evidence/task-6-sequence-alt.txt
  ```

  **Commit**: YES
  - Message: `feat(uml-sequence): implement authoring API, domain model, and IR compilation`
  - Files: `packages/uml-sequence/src/**`

- [x] 7. Implement @drawspec/architecture — Workspace, C4 elements, relationships, and views

  **What to do**:
  - Define architecture-specific types: `Workspace`, `ArchitectureModel`, `ArchitectureView`
  - Implement `workspace()` factory function matching spec Section 6.1:
    - `model.add(person(name))` → person element
    - `model.add(softwareSystem(name, opts))` → software system element
    - `system.add(container(name, opts))` → container within system
    - `database(name, opts)` → database element
  - Implement C4 element kinds: person, softwareSystem, container, database (MVP subset)
  - Implement relationship API: `elementA.uses(elementB, "label", opts)` with technology, protocol, tags
  - Implement views:
    - `views.systemContext(system, id, callback)` → system context view
    - `views.container(system, id, callback)` → container view
  - Implement view configuration: `view.include()`, `view.autoLayout("left-right")`
  - Implement nested workspace support: `model.use(subModel)` for composition
  - Implement styles: `styles.element(tag, opts)`, `styles.relationship(tag, opts)`
  - Compile architecture views → `DiagramDocument` (IR) with kind="architecture"
  - Add unit tests matching spec's "Payments" workspace example (Section 6.1)
  - Add compilation tests: workspace → model → views → IR

  **Must NOT do**: Implement rendering. No component/deployment elements (post-MVP). No filtered/landscape/dynamic views.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6 — sequence diagrams)
  - **Parallel Group**: Gate 1D
  - **Blocks**: Task 11 (architecture layout), Task 13 (CLI architecture rendering)
  - **Blocked By**: Tasks 4, 5

  **References**:
  **Pattern References**:
  - `spec.md` lines 244-298 — Complete architecture authoring example (Payments workspace)
  - `spec.md` lines 409-495 — Architecture model core concepts, elements, relationships, views
  - `spec.md` lines 710-728 — @drawspec/architecture package responsibilities

  **API/Type References**:
  - `spec.md` lines 429-442 — Element kinds (MVP: person, softwareSystem, container, database)
  - `spec.md` lines 448-472 — Relationship model with options
  - `spec.md` lines 476-495 — View types (MVP: systemContext, container)
  - `spec.md` lines 498-516 — Styles API
  - `spec.md` lines 1609-1620 — Composition via model.use()

  **Acceptance Criteria**:
  - [ ] `bun test packages/architecture` passes with ≥10 tests
  - [ ] Can create the "Payments" workspace from spec Section 6.1
  - [ ] System context view compiles to valid DiagramDocument
  - [ ] Container view compiles to valid DiagramDocument
  - [ ] Relationships carry technology, tags, and label metadata
  - [ ] Nested workspaces via `model.use()` work correctly
  - [ ] Auto-generated IDs are deterministic

  **QA Scenarios**:
  ```
  Scenario: Payments workspace compiles to valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create spec's "Payments" workspace (customer, payments system, web/api/ledger)
      2. Compile systemContext view to IR
      3. Assert: nodes include Customer, Payment Platform
      4. Assert: edges include "Creates payment" from Customer to Web App
      5. Compile containerView to IR
      6. Assert: nodes include Web App, API, Ledger DB
    Expected Result: Both views produce valid IR with correct elements
    Evidence: .sisyphus/evidence/task-7-arch-workspace.txt

  Scenario: Nested workspaces compose correctly
    Tool: Bash (bun test)
    Steps:
      1. Create "Payments" sub-workspace
      2. Create "Platform" workspace that imports via model.use(payments)
      3. Compile to IR
      4. Assert: Platform model includes Payments elements
    Expected Result: Composition works without ID collisions
    Evidence: .sisyphus/evidence/task-7-nested-workspace.txt
  ```

  **Commit**: YES
  - Message: `feat(architecture): implement workspace, C4 elements, relationships, and views`
  - Files: `packages/architecture/src/**`

---

## Gate 1E: Validation Engine + Rules

---

- [x] 8. Implement @drawspec/validation — Rule engine, context, and initial rule packs

  **What to do**:
  - Define `Rule` interface with name, meta (description, recommended, fixable), and `create(context)` method
  - Define `RuleContext` with `report()`, `model`, `diagram`, `config` access
  - Define `RuleVisitor` pattern for traversal
  - Implement rule engine: loads rules, runs against model/IR, collects diagnostics
  - Implement rule severity configuration: `off | info | warn | error` or tuple with options
  - Implement initial architecture rules:
    - `architecture/require-technology` — containers must specify technology
    - `architecture/no-frontend-to-database` — no direct frontend→database relationships
    - `architecture/no-orphan-elements` — elements must have relationships or be in views
    - `architecture/no-duplicate-names-in-scope` — no duplicate element names
  - Implement initial diagram rules:
    - `diagram/require-title` — diagrams must have a title
    - `diagram/no-empty-label` — nodes/edges must have labels
    - `diagram/no-duplicate-node-id` — node IDs must be unique
  - Implement preset: `recommended` (all recommended rules at default severity)
  - Add unit tests for each rule with valid and invalid fixtures
  - Add unit tests for rule engine (loading, configuration, severity override)

  **Must NOT do**: Import domain-specific packages directly. Rules work against `ArchitectureModel` and `DiagramDocument` types from core.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 9, 10, 11)
  - **Parallel Group**: Gate 1E
  - **Blocks**: Task 13 (CLI check command)
  - **Blocked By**: Task 4

  **References**:
  - `spec.md` lines 1121-1228 — Complete validation/linting specification (Diagnostic, Rule API, built-in rules, presets)
  - `spec.md` lines 728-744 — @drawspec/validation responsibilities
  - `spec.md` lines 1413-1428 — Architecture rule test example

  **Acceptance Criteria**:
  - [ ] `bun test packages/validation` passes with ≥15 tests
  - [ ] Rule engine can load and run rules against an architecture model
  - [ ] Each architecture rule has positive and negative test cases
  - [ ] Severity override works (config changes rule severity)
  - [ ] `recommended` preset exports all recommended rules

  **QA Scenarios**:
  ```
  Scenario: Frontend-to-database rule detects violations
    Tool: Bash (bun test)
    Steps:
      1. Create model with frontend container and database
      2. Add relationship: frontend.uses(database, "reads")
      3. Run no-frontend-to-database rule
      4. Assert: diagnostic with severity "error" reported
    Expected Result: Rule correctly detects the anti-pattern
    Evidence: .sisyphus/evidence/task-8-validation-rules.txt

  Scenario: Rule engine respects severity config
    Tool: Bash (bun test)
    Steps:
      1. Configure rule as "warn" instead of default "error"
      2. Run engine against violating model
      3. Assert: diagnostic severity is "warning" not "error"
    Expected Result: Severity override works
    Evidence: .sisyphus/evidence/task-8-severity-override.txt
  ```

  **Commit**: YES
  - Message: `feat(validation): implement rule engine and initial architecture + diagram rules`
  - Files: `packages/validation/src/**`

---

## Gate 1F: Layout + SVG Renderer

> Gates 1F layout and renderer depend on core IR (Gate 1B) but NOT on domain packages.
> These can run in parallel with Gates 1C, 1D, 1E.

---

- [x] 9. Implement @drawspec/layout — Interfaces, sequence layout, and simple graph layout

  **What to do**:
  - Define `LayoutEngine` interface: `name`, `supports(doc)`, `layout(doc, opts) → PositionedDiagram`
  - Define `PositionedDiagram` type: nodes with x/y/width/height, edges with waypoints
  - Define `LayoutOptions`: direction (TB/LR), spacing, padding
  - Implement sequence layout (first-party, deterministic):
    - Lifelines positioned at equal horizontal intervals
    - Messages positioned at sequential vertical intervals
    - Alt/else fragments drawn as boxes around lifelines
    - Activation bars computed from message flow
  - Implement simple graph layout (left-right, top-bottom):
    - Naive layered approach: sort nodes by dependency depth, position in rows/columns
    - Deterministic output: same input → same positions
  - Implement layout caching: key = IR content hash, value = PositionedDiagram
  - Add unit tests for both layout strategies with deterministic position verification
  - Add edge case tests: single node, empty diagram, self-loops

  **Must NOT do**: Import domain packages. Layout works on DiagramDocument only.
  Use external layout libraries (dagre, elk) only as optional adapters (post-MVP).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 8, 10)
  - **Parallel Group**: Gate 1F
  - **Blocks**: Task 10 (SVG renderer needs PositionedDiagram), Task 13 (CLI render)
  - **Blocked By**: Task 4

  **References**:
  - `spec.md` lines 762-788 — @drawspec/layout responsibilities and adapter pattern
  - `spec.md` lines 1268-1288 — Layout interface, renderer interface, built-in strategies
  - `spec.md` lines 782-788 — Sequence layout should be first-party

  **Acceptance Criteria**:
  - [ ] `bun test packages/layout` passes with ≥10 tests
  - [ ] Sequence layout produces deterministic positions for given input
  - [ ] Simple graph layout produces deterministic positions
  - [ ] Layout cache hits on repeated calls with same IR
  - [ ] Edge cases handled: single node, empty diagram, self-loops

  **QA Scenarios**:
  ```
  Scenario: Sequence layout is deterministic
    Tool: Bash (bun test)
    Steps:
      1. Create sequence IR with 4 participants and 6 messages
      2. Run layout twice with same input
      3. Assert: both PositionedDiagram outputs are deeply equal
    Expected Result: Byte-identical layout output
    Evidence: .sisyphus/evidence/task-9-sequence-layout.txt
  ```

  **Commit**: YES
  - Message: `feat(layout): implement interfaces, sequence layout, and simple graph layout`
  - Files: `packages/layout/src/**`

- [x] 10. Implement @drawspec/renderer-svg — Deterministic SVG renderer

  **What to do**:
  - Define `Renderer<T>` interface: `name`, `render(doc, opts) → Promise<T>`
  - Implement SVG renderer that consumes `DiagramDocument` + `PositionedDiagram`:
    - Render nodes as rectangles/rounded rects/cylinders/shapes based on kind
    - Render edges as paths/arrows with labels
    - Render groups as bounding boxes with labels (for alt/else fragments, containers)
    - Render annotations (notes) as note-shaped boxes
  - Implement styling resolution: explicit style → tag style → kind defaults → theme defaults
  - Implement SVG accessibility: `<title>`, `<desc>`, ARIA attributes, stable IDs, text as text
  - Ensure byte-for-byte determinism:
    - Stable SVG attribute ordering
    - Stable element ordering
    - Deterministic ID generation for SVG elements
    - No timestamps or random values
  - Implement text measurement for label positioning (deterministic approximations)
  - Add golden test infrastructure: render fixture → save SVG → compare on next run
  - Create initial golden fixtures for sequence and architecture diagrams

  **Must NOT do**: Import domain packages. Renderer works on IR + layout output only.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (layout interface only needed, not specific layout impl)
  - **Parallel Group**: Gate 1F (after Task 9 interface definitions are available)
  - **Blocks**: Task 13 (CLI render command), Task 15 (viewer)
  - **Blocked By**: Task 4 (core IR types), Task 9 (PositionedDiagram type)

  **References**:
  - `spec.md` lines 789-800 — Renderer packages overview (SVG is first-class)
  - `spec.md` lines 1229-1310 — Complete rendering specification (pipeline, interfaces, accessibility, styling)
  - `spec.md` lines 1433-1454 — Golden test example and snapshot policy

  **Acceptance Criteria**:
  - [ ] `bun test packages/renderer-svg` passes with ≥8 tests including golden tests
  - [ ] Rendering same input twice produces byte-identical SVG (`cmp` succeeds)
  - [ ] SVG output includes `<title>` and `<desc>` elements
  - [ ] SVG uses stable IDs (not random)
  - [ ] Text labels render as `<text>` elements (not paths)
  - [ ] Golden fixture files exist for at least 2 diagram types

  **QA Scenarios**:
  ```
  Scenario: SVG rendering is deterministic
    Tool: Bash
    Steps:
      1. Create a sequence IR fixture, layout it, render to SVG
      2. Write to /tmp/ds-render-a.svg
      3. Render again with same input, write to /tmp/ds-render-b.svg
      4. Run `cmp /tmp/ds-render-a.svg /tmp/ds-render-b.svg`
    Expected Result: cmp exits 0 (files are identical)
    Evidence: .sisyphus/evidence/task-10-deterministic-svg.txt

  Scenario: SVG has accessibility features
    Tool: Bash
    Steps:
      1. Render a diagram with title "Payment Flow"
      2. Parse SVG output
      3. Assert: contains <title> element with "Payment Flow"
      4. Assert: contains <desc> element
      5. Assert: no random/timestamp-based IDs
    Expected Result: SVG meets accessibility requirements
    Evidence: .sisyphus/evidence/task-10-svg-a11y.txt
  ```

  **Commit**: YES
  - Message: `feat(renderer-svg): implement deterministic SVG renderer with golden tests`
  - Files: `packages/renderer-svg/src/**`

---

## Gate 1G: CLI (check, render, inspect)

---

- [x] 11. Implement @drawspec/cli — File discovery, module loading, check, render, and inspect

  **What to do**:
  - Implement CLI binary as `drawspec` with subcommands, using argparse or similar
  - Implement file discovery: glob patterns (`**/*.diagram.ts`, `**/*.arch.ts`, etc.)
  - Implement module loading: dynamically import `.ts` files using Bun's native TS support
  - Implement config loading: `drawspec.config.ts` or `drawspec.config.json`
  - Implement `drawspec check [files...]`:
    - Discover files → load modules → compile to IR → run validation → report diagnostics
    - Output formats: pretty (terminal), JSON, github (GitHub Actions annotations)
    - Exit code: 0 if no errors, 1 if errors
  - Implement `drawspec render [files...]`:
    - Discover → load → compile → layout → render SVG → write to output dir
    - Options: `--out <dir>`, `--format svg|json`, `--theme <name>`
    - Deterministic: same files → same output
  - Implement `drawspec inspect [file]`:
    - Load module → compile to IR → print as JSON or pretty format
    - Options: `--format json|pretty`, `--model`, `--ir`, `--elements`, `--relationships`
  - Add CLI integration tests using Bun's `spawn` or shell tests
  - Register binary in package.json `bin` field with aliases `ds` and `dspec`

  **Must NOT do**: Implement watch or serve commands (next task). No static site generation.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on most other packages)
  - **Parallel Group**: Gate 1G (sequential within gate)
  - **Blocks**: Task 12 (watch/serve builds on check/render)
  - **Blocked By**: Tasks 4, 5, 6, 7, 8, 9, 10

  **References**:
  - `spec.md` lines 808-820 — @drawspec/cli responsibilities
  - `spec.md` lines 929-1070 — Complete CLI specification (check, render, inspect commands)
  - `spec.md` lines 1070-1118 — Configuration (drawspec.config.ts)

  **Acceptance Criteria**:
  - [ ] `drawspec check fixtures/mvp/` runs and reports diagnostics
  - [ ] `drawspec render fixtures/mvp/ --out /tmp/ds-out` produces SVG files
  - [ ] `drawspec inspect fixtures/mvp/sequence-basic.sequence.ts --format json` outputs valid JSON IR
  - [ ] `drawspec --help` shows available commands
  - [ ] CLI binary is accessible as `drawspec`, `ds`, and `dspec`
  - [ ] Integration tests pass

  **QA Scenarios**:
  ```
  Scenario: CLI check reports diagnostics
    Tool: Bash
    Steps:
      1. Create a fixture with a known validation violation (missing technology)
      2. Run `drawspec check fixtures/mvp/ --format json`
      3. Parse JSON output
      4. Assert: contains diagnostic with code "architecture/require-technology"
    Expected Result: Validation diagnostics reported correctly
    Evidence: .sisyphus/evidence/task-11-cli-check.txt

  Scenario: CLI render produces SVGs
    Tool: Bash
    Steps:
      1. Run `drawspec render fixtures/mvp/ --out /tmp/ds-render-test`
      2. Assert: /tmp/ds-render-test contains .svg files
      3. Assert: SVG files are valid (start with <svg)
    Expected Result: SVG files generated for all discovered diagrams
    Evidence: .sisyphus/evidence/task-11-cli-render.txt

  Scenario: Deterministic rendering via CLI
    Tool: Bash
    Steps:
      1. Run `drawspec render fixtures/mvp/ --out /tmp/ds-determinism-a`
      2. Run `drawspec render fixtures/mvp/ --out /tmp/ds-determinism-b`
      3. Run `diff -r /tmp/ds-determinism-a /tmp/ds-determinism-b`
    Expected Result: No differences between two renders
    Evidence: .sisyphus/evidence/task-11-cli-determinism.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): implement check, render, and inspect commands`
  - Files: `packages/cli/src/**`

---

## Gate 1H: Watch, Serve, Viewer, Testkit, Fixtures, CI

---

- [x] 12. Implement CLI watch and serve commands + SvelteKit preview app with framework-neutral viewer

  **What to do**:
  - Implement `drawspec watch [files...]`:
    - File watcher detects changes in glob patterns
    - Debounced recompilation (configurable, default 80ms)
    - Dependency-aware invalidation (recompile only changed + dependent modules)
    - WebSocket server pushes updates to connected browser clients
    - Options: `--port`, `--host`, `--debounce <ms>`
  - Implement `drawspec serve [files...]`:
    - Starts SvelteKit preview app (in `apps/preview/`)
    - Opens browser automatically (`--open`)
    - Serves rendered SVGs with live updates via WebSocket
    - Includes sidebar with diagram/view list, main SVG preview, diagnostics panel
  - Create `apps/preview/` SvelteKit app:
    - Configure with `@sveltejs/adapter-bun` (strict Bun runtime)
    - Use `bun --bun vite dev` for development
  - Implement @drawspec/viewer as framework-neutral web components:
    - Build `<drawspec-diagram>` custom element (Svelte → customElement)
    - Props: `src` (IR JSON URL), `theme`, `interactive` (zoom/pan)
    - Zoom/pan controls
    - Diagnostics overlay
  - Add Playwright tests for viewer: load diagram, assert SVG renders, test zoom/pan
  - Add integration test: edit diagram file → verify preview updates

  **Must NOT do**: No static site generation. No click-to-source. No relationship filtering. No comparison view.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13)
  - **Parallel Group**: Gate 1H
  - **Blocks**: None (final MVP feature)
  - **Blocked By**: Tasks 10, 11

  **References**:
  - `spec.md` lines 1313-1375 — Preview system specification (goals, pipeline, caching, UI)
  - `spec.md` lines 845-856 — @drawspec/react (adapt for SvelteKit + web components)
  - `spec.md` lines 835-845 — Vite plugin responsibilities (reference for HMR integration)

  **Acceptance Criteria**:
  - [ ] `drawspec serve fixtures/mvp/ --port 4173` starts without error
  - [ ] Browser loads preview and displays rendered SVGs
  - [ ] Editing a fixture file triggers re-render in browser within 200ms
  - [ ] `<drawspec-diagram>` web component renders in plain HTML page
  - [ ] Zoom/pan works in viewer
  - [ ] Diagnostics panel shows validation errors
  - [ ] Playwright tests pass

  **QA Scenarios**:
  ```
  Scenario: Serve and live preview
    Tool: Playwright
    Steps:
      1. Start `drawspec serve fixtures/mvp/ --port 4173`
      2. Navigate to http://localhost:4173
      3. Assert: page loads, SVG element present
      4. Assert: diagram title visible in sidebar
      5. Click on diagram title in sidebar
      6. Assert: main area shows corresponding SVG
    Expected Result: Preview app loads and displays diagrams
    Evidence: .sisyphus/evidence/task-12-serve-preview.png

  Scenario: Web component works in plain HTML
    Tool: Playwright
    Steps:
      1. Create plain HTML page with <drawspec-diagram src="test-ir.json">
      2. Serve via simple HTTP server
      3. Assert: custom element renders SVG
      4. Assert: zoom controls visible and functional
    Expected Result: Framework-neutral web component works
    Evidence: .sisyphus/evidence/task-12-web-component.png
  ```

  **Commit**: YES
  - Message: `feat(cli,viewer): implement watch, serve, and framework-neutral viewer`
  - Files: `packages/cli/src/**, packages/viewer/src/**, apps/preview/**`

- [x] 13. Implement @drawspec/testkit and create MVP fixture suite

  **What to do**:
  - Implement testkit utilities:
    - `compileDiagram(module)` → loads and compiles a diagram module to IR
    - `compileWorkspace(module)` → loads and compiles an architecture workspace
    - `renderFixture(ir)` → layout + render to SVG string
    - `expectDiagram(ir).toHaveNode(name)`, `expectDiagram(ir).toHaveEdge(label)`
    - `expectValid(diagnostic)` / `expectViolation(diagnostic, ruleCode)`
    - Snapshot helpers for IR JSON and SVG golden files
  - Create MVP fixture suite under `fixtures/mvp/`:
    - `sequence-basic.sequence.ts` — simple payment flow (spec Section 6.2)
    - `sequence-alt.sequence.ts` — alt/else control flow (spec Section 6.3)
    - `architecture-payments.arch.ts` — C4 workspace (spec Section 6.1)
    - `architecture-nested.arch.ts` — nested workspace composition
    - `invalid-missing-technology.arch.ts` — for validation rule testing
    - `invalid-empty-title.sequence.ts` — for diagram rule testing
    - `drawspec.config.ts` — config with recommended rules
  - Generate golden SVG files for all fixtures
  - Add golden test suite that verifies rendering stability
  - Update CI workflow to include `drawspec check` and `drawspec render` on fixtures
  - Verify all fixtures pass `drawspec check` (except invalid ones)

  **Must NOT do**: Don't create tests for post-MVP diagram types. Don't import CLI for unit tests.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 12)
  - **Parallel Group**: Gate 1H
  - **Blocks**: None (final MVP task)
  - **Blocked By**: Tasks 4, 5, 6, 7, 8, 9, 10

  **References**:
  - `spec.md` lines 1374-1454 — Testing strategy (layers, builder tests, architecture rule tests, golden tests, snapshot policy)
  - `spec.md` lines 688-690 — @drawspec/testkit in package layout

  **Acceptance Criteria**:
  - [ ] `bun test fixtures/` passes (golden tests for all MVP fixtures)
  - [ ] `drawspec check fixtures/mvp/` reports 0 errors for valid fixtures
  - [ ] `drawspec check fixtures/mvp/invalid-*` reports expected violations
  - [ ] `drawspec render fixtures/mvp/ --out /tmp/ds-golden` produces golden SVGs
  - [ ] Golden SVGs are deterministic (re-render matches)
  - [ ] CI workflow includes fixture verification

  **QA Scenarios**:
  ```
  Scenario: All MVP fixtures are valid
    Tool: Bash
    Steps:
      1. Run `drawspec check fixtures/mvp/sequence-basic.sequence.ts` → exit 0
      2. Run `drawspec check fixtures/mvp/architecture-payments.arch.ts` → exit 0
      3. Run `drawspec check fixtures/mvp/architecture-nested.arch.ts` → exit 0
    Expected Result: All valid fixtures pass validation
    Evidence: .sisyphus/evidence/task-13-fixtures-valid.txt

  Scenario: Invalid fixtures produce expected violations
    Tool: Bash
    Steps:
      1. Run `drawspec check fixtures/mvp/invalid-missing-technology.arch.ts --format json`
      2. Parse JSON output
      3. Assert: contains diagnostic code "architecture/require-technology"
    Expected Result: Invalid fixtures correctly caught by rules
    Evidence: .sisyphus/evidence/task-13-fixtures-invalid.txt

  Scenario: Golden SVG rendering is stable
    Tool: Bash
    Steps:
      1. Run `drawspec render fixtures/mvp/ --out /tmp/ds-golden-a`
      2. Run `drawspec render fixtures/mvp/ --out /tmp/ds-golden-b`
      3. Run `diff -r /tmp/ds-golden-a /tmp/ds-golden-b`
    Expected Result: No diff (byte-for-byte identical)
    Evidence: .sisyphus/evidence/task-13-golden-stable.txt
  ```

  **Commit**: YES
  - Message: `feat(testkit,fixtures): implement test helpers and MVP fixture suite`
  - Files: `packages/testkit/src/**, fixtures/**`

---

> **STAGE 1 MVP GATE**: Before proceeding to Stage 2, verify:
> - `bun run check` passes
> - `drawspec check fixtures/mvp/` reports 0 errors (valid fixtures)
> - `drawspec render fixtures/mvp/ --out /tmp/ds-out` produces valid SVGs
> - Deterministic: two renders produce identical output
> - `drawspec serve fixtures/mvp/` opens working preview
> - Run Final Verification Wave (F1-F4)
> - **Get explicit user "okay" before proceeding**

---

## STAGE 2: UML Expansion

> **Gate**: Each UML package is independently deliverable. Add them in parallel where possible.
> **Depends on**: Stage 1 complete (core IR, layout, renderer, CLI, validation all functional)

- [ ] 14. Implement @drawspec/uml-class — Class diagrams with fields, methods, interfaces, enums, inheritance

  **What to do**: Implement class diagram authoring API matching spec Section 6.4 (`class_`, `interface_`, `enum_`, `implements`, `uses`). Compile to IR with kind="class". Add class-specific validation rules (no-circular-inheritance, no-duplicate-member, require-visibility). Add golden SVG tests.
  **References**: `spec.md` lines 346-369 (class diagram example), `spec.md` lines 1213-1218 (class rules)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 4, 5, 9, 10
  **Acceptance Criteria**:
  - [ ] `bun test packages/uml-class` passes with ≥6 tests
  - [ ] Can create spec's "Domain model" example (Section 6.4) with classes, interfaces, enums
  - [ ] Compiles to valid DiagramDocument with kind="class"
  - [ ] Class rules: no-circular-inheritance, no-duplicate-member pass
  **QA Scenarios**:
  ```
  Scenario: Class diagram compiles to valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create spec's "Domain model" example (Payment class, AggregateRoot interface, PaymentStatus enum)
      2. Compile to IR
      3. Assert: 3 nodes (Payment, AggregateRoot, PaymentStatus)
      4. Assert: edges for implements and uses relationships
    Expected Result: IR matches expected class diagram structure
    Evidence: .sisyphus/evidence/task-14-class-basic.txt

  Scenario: Circular inheritance detected
    Tool: Bash (bun test)
    Steps:
      1. Create classes A and B where A extends B and B extends A
      2. Run no-circular-inheritance rule
      3. Assert: diagnostic with code "class/no-circular-inheritance"
    Expected Result: Circular inheritance caught by validation
    Evidence: .sisyphus/evidence/task-14-class-circular.txt
  ```

- [ ] 15. Implement @drawspec/uml-state — State diagrams with states, transitions, initial/final pseudostates

  **What to do**: Implement state diagram authoring API matching spec Section 6.5 (`state`, `initial`, `final`, `.to()` transitions). Compile to IR with kind="state". Add state-specific layout strategy. Add golden SVG tests.
  **References**: `spec.md` lines 375-388 (state diagram example)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 4, 5, 9, 10
  **Acceptance Criteria**:
  - [ ] `bun test packages/uml-state` passes with ≥5 tests
  - [ ] Can create spec's "Payment lifecycle" example (Section 6.5)
  - [ ] Compiles to valid DiagramDocument with kind="state"
  - [ ] Golden SVG test passes
  **QA Scenarios**:
  ```
  Scenario: State diagram compiles to valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create spec's "Payment lifecycle" example (Created, Authorized, Captured, Failed states)
      2. Compile to IR
      3. Assert: nodes include initial pseudostate, Created, Authorized, Captured, final(Failed)
      4. Assert: edges match transition labels ("authorize", "decline", "capture")
    Expected Result: IR matches expected state diagram structure
    Evidence: .sisyphus/evidence/task-15-state-basic.txt

  Scenario: Golden SVG renders correctly
    Tool: Bash
    Steps:
      1. Render state diagram fixture to SVG
      2. Compare against golden file
      3. Assert: byte-identical match
    Expected Result: SVG matches golden fixture
    Evidence: .sisyphus/evidence/task-15-state-golden.svg
  ```

- [ ] 16. Implement @drawspec/uml-component — Component diagrams with components, interfaces, dependencies

  **What to do**: Implement component diagram authoring API. Compile to IR with kind="component". Add component-specific layout. Add validation rules.
  **References**: `spec.md` lines 186-187 (component diagrams in initial target), `spec.md` lines 745-762 (UML package pattern)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 4, 5, 7, 9, 10
  **Can Run In Parallel**: YES (with Tasks 14, 15, 17)
  **Acceptance Criteria**:
  - [ ] `bun test packages/uml-component` passes with ≥5 tests
  - [ ] Can create component diagram with components, interfaces, lollipop notation
  - [ ] Compiles to valid DiagramDocument with kind="component"
  **QA Scenarios**:
  ```
  Scenario: Component diagram compiles to valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create component diagram with 3 components and 2 interfaces
      2. Compile to IR
      3. Assert: 3 nodes of kind "component", 2 nodes of kind "interface"
      4. Assert: dependency edges between components
    Expected Result: Component IR structure is valid
    Evidence: .sisyphus/evidence/task-16-component-basic.txt
  ```

- [ ] 17. Implement @drawspec/uml-deployment — Deployment diagrams with nodes, artifacts, communication paths

  **What to do**: Implement deployment diagram authoring API with deploymentNode, infrastructureNode, artifact. Compile to IR with kind="deployment". Add deployment-specific layout. Add validation rules.
  **References**: `spec.md` lines 192 (deployment diagrams in initial target), `spec.md` lines 430-442 (deploymentNode element)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 4, 5, 9, 10
  **Can Run In Parallel**: YES (with Tasks 14, 15, 16)
  **Acceptance Criteria**:
  - [ ] `bun test packages/uml-deployment` passes with ≥5 tests
  - [ ] Can create deployment diagram with nodes, artifacts, communication paths
  - [ ] Compiles to valid DiagramDocument with kind="deployment"
  **QA Scenarios**:
  ```
  Scenario: Deployment diagram compiles to valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create deployment diagram with 2 deployment nodes, 1 infrastructure node, 2 artifacts
      2. Compile to IR
      3. Assert: correct node kinds and nesting (artifacts within deployment nodes)
    Expected Result: Deployment IR structure is valid
    Evidence: .sisyphus/evidence/task-17-deployment-basic.txt
  ```

- [ ] 18. Implement @drawspec/uml-activity — Limited activity diagrams with actions, decisions, flows

  **What to do**: Implement activity diagram authoring API matching spec Section 6.6 (`action`, `decision`, `start`, `end`, `.to()` chains, `.when()` branches). Compile to IR with kind="activity". Add activity-specific layout (flowchart-style). This is a LIMITED v1 subset — no swimlanes, no partitions.
  **References**: `spec.md` lines 393-407 (activity diagram example), `spec.md` lines 194 ("limited v1 subset")
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 4, 5, 9, 10
  **Acceptance Criteria**:
  - [ ] `bun test packages/uml-activity` passes with ≥5 tests
  - [ ] Can create spec's "Payment flow" example (Section 6.6) with actions, decisions, branches
  - [ ] Compiles to valid DiagramDocument with kind="activity"
  **QA Scenarios**:
  ```
  Scenario: Activity diagram compiles to valid IR
    Tool: Bash (bun test)
    Steps:
      1. Create spec's "Payment flow" example with submit→authorize→approved→capture/reject
      2. Compile to IR
      3. Assert: nodes include start, actions, decision, end
      4. Assert: edges follow "yes" and "no" branches from decision
    Expected Result: Activity IR structure is valid
    Evidence: .sisyphus/evidence/task-18-activity-basic.txt
  ```

- [ ] 19. Expand validation rules — Add domain-specific rule packs for class, state, component, deployment

  **What to do**: Add class rules (no-circular-inheritance, no-duplicate-member, no-unknown-type-ref, require-visibility). Add diagram rules (max-nodes, max-edges, no-floating-node). Update `recommended` preset.
  **References**: `spec.md` lines 1162-1198 (all built-in diagram rules), `spec.md` lines 1213-1218 (class rules)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 8, 14, 15, 16, 17, 18
  **Acceptance Criteria**:
  - [ ] `bun test packages/validation` passes with all new rule tests
  - [ ] Each new rule has positive and negative test cases
  - [ ] `recommended` preset updated with new rules
  **QA Scenarios**:
  ```
  Scenario: New class rules work correctly
    Tool: Bash (bun test)
    Steps:
      1. Test no-circular-inheritance: A→B→A cycle → error reported
      2. Test no-duplicate-member: class with 2 fields named "id" → error reported
      3. Test require-visibility: class methods without visibility → error reported
    Expected Result: All new rules detect violations
    Evidence: .sisyphus/evidence/task-19-new-rules.txt
  ```

- [ ] 20. Expand layout strategies — Add dagre and elkjs adapters as optional packages

  **What to do**: Create `@drawspec/layout-dagre` and `@drawspec/layout-elk` packages. Implement `LayoutEngine` interface for each. Register as layout adapters. Add layout selection config in CLI.
  **References**: `spec.md` lines 776-788 (layout adapters)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Task 9
  **Can Run In Parallel**: YES (with Tasks 14-19)
  **Acceptance Criteria**:
  - [ ] `bun test packages/layout-dagre` passes
  - [ ] `bun test packages/layout-elk` passes
  - [ ] `drawspec render --layout dagre` uses dagre adapter
  - [ ] Both adapters produce deterministic layout
  **QA Scenarios**:
  ```
  Scenario: Dagre adapter produces deterministic layout
    Tool: Bash (bun test)
    Steps:
      1. Create graph IR with 10 nodes and 15 edges
      2. Run dagre layout twice with same input
      3. Assert: both outputs deeply equal
    Expected Result: Deterministic layout output
    Evidence: .sisyphus/evidence/task-20-dagre-deterministic.txt
  ```

- [ ] 21. Add use case diagram support (if cheap after actor/system modeling exists)

  **What to do**: Implement use case diagram authoring API if actor/system modeling from architecture makes this cheap. Otherwise defer. Compile to IR with kind="use-case".
  **References**: `spec.md` lines 195 ("if cheap after actor/system modeling exists")
  **Category**: `quick`, **Skills**: [], **Blocked By**: Tasks 4, 5, 7
  **Acceptance Criteria**:
  - [ ] `bun test packages/uml-usecase` passes (if implemented)
  - [ ] Can create simple use case diagram with actors and use cases
  - [ ] OR: documented decision to defer with rationale
  **QA Scenarios**:
  ```
  Scenario: Use case diagram or documented deferral
    Tool: Bash
    Steps:
      1. Check if @drawspec/uml-usecase package exists
      2. If yes: run `bun test packages/uml-usecase` → pass
      3. If no: check for deferral note in package BUILD.md
    Expected Result: Either working implementation or documented deferral
    Evidence: .sisyphus/evidence/task-21-usecase.txt
  ```

> **STAGE 2 GATE**: All UML diagram types render correctly. Validation rules pass. `drawspec check` and `drawspec render` work for all diagram types. Run Final Verification Wave.

---

## STAGE 3: Exporters & Docs Ecosystem

> **Depends on**: Stage 1 complete (Stage 2 optional, exporters work against IR)

- [x] 22. Implement @drawspec/exporter-mermaid — Mermaid text export from Diagram IR

  **What to do**: Create exporter package. Transform DiagramDocument to Mermaid syntax. Support sequence, class, state diagram exports. Best-effort — document unsupported features.
  **References**: `spec.md` lines 1669-1687 (Mermaid exporter spec)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Task 4
  **Acceptance Criteria**:
  - [ ] `bun test packages/exporter-mermaid` passes with ≥4 tests
  - [ ] Mermaid output is valid syntax (parseable by mermaid CLI)
  - [ ] Unsupported features documented in output as comments
  **QA Scenarios**:
  ```
  Scenario: Sequence diagram exports to valid Mermaid
    Tool: Bash
    Steps:
      1. Create sequence IR with 4 participants and 6 messages
      2. Export to Mermaid syntax
      3. Assert: output starts with "sequenceDiagram"
      4. Assert: contains participant declarations and message arrows
    Expected Result: Valid Mermaid sequence diagram
    Evidence: .sisyphus/evidence/task-22-mermaid-sequence.txt
  ```

- [ ] 23. Implement @drawspec/exporter-plantuml — PlantUML text export from Diagram IR

  **What to do**: Create exporter package. Transform DiagramDocument to PlantUML syntax. Support sequence, class, state, activity, component exports. Best-effort.
  **References**: `spec.md` lines 1689-1700 (PlantUML exporter spec)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Task 4
  **Can Run In Parallel**: YES (with Task 22)
  **Acceptance Criteria**:
  - [ ] `bun test packages/exporter-plantuml` passes with ≥4 tests
  - [ ] PlantUML output follows standard `.puml` syntax
  **QA Scenarios**:
  ```
  Scenario: Sequence diagram exports to valid PlantUML
    Tool: Bash
    Steps:
      1. Create sequence IR with 4 participants and 6 messages
      2. Export to PlantUML syntax
      3. Assert: output contains @startuml/@enduml
      4. Assert: contains participant and arrow declarations
    Expected Result: Valid PlantUML sequence diagram
    Evidence: .sisyphus/evidence/task-23-plantuml-sequence.txt
  ```

- [ ] 24. Implement @drawspec/exporter-d2 — D2 text export from Diagram IR

  **What to do**: Create exporter package. Transform DiagramDocument to D2 syntax. Support general graph exports. Best-effort.
  **References**: `spec.md` lines 1702-1710 (D2 exporter spec)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Task 4
  **Can Run In Parallel**: YES (with Tasks 22, 23)
  **Acceptance Criteria**:
  - [ ] `bun test packages/exporter-d2` passes with ≥3 tests
  - [ ] D2 output is valid syntax
  **QA Scenarios**:
  ```
  Scenario: Architecture diagram exports to valid D2
    Tool: Bash
    Steps:
      1. Create architecture IR with 5 elements and 4 relationships
      2. Export to D2 syntax
      3. Assert: contains node declarations and arrow connections
    Expected Result: Valid D2 graph
    Evidence: .sisyphus/evidence/task-24-d2-arch.txt
  ```

- [ ] 25. Stabilize JSON exporter and add CLI `export` command

  **What to do**: Ensure JSON export is complete and stable. Add `drawspec export [files...] --format mermaid|plantuml|d2|json --out <dir>` command. Add integration tests.
  **References**: `spec.md` lines 1044-1060 (export command), `spec.md` lines 1712-1715 (JSON exporter)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 22, 23, 24, 11
  **Acceptance Criteria**:
  - [ ] `drawspec export fixtures/mvp/ --format json --out /tmp/ds-export` produces valid JSON
  - [ ] `drawspec export fixtures/mvp/ --format mermaid --out /tmp/ds-export` produces Mermaid files
  - [ ] CLI integration tests pass
  **QA Scenarios**:
  ```
  Scenario: CLI export command works for all formats
    Tool: Bash
    Steps:
      1. Run `drawspec export fixtures/mvp/ --format json --out /tmp/ds-export-json`
      2. Run `drawspec export fixtures/mvp/ --format mermaid --out /tmp/ds-export-mermaid`
      3. Assert: JSON files are valid JSON
      4. Assert: Mermaid files contain valid Mermaid syntax
    Expected Result: All export formats produce valid output
    Evidence: .sisyphus/evidence/task-25-cli-export.txt
  ```

- [ ] 26. Implement @drawspec/vite-plugin — Vite integration for diagram hot reload and virtual modules

  **What to do**: Create Vite plugin that compiles diagram modules on import. Support HMR. Generate virtual modules for compiled IR. Support static asset generation.
  **References**: `spec.md` lines 835-845 (Vite plugin responsibilities)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 10, 11
  **Acceptance Criteria**:
  - [ ] Vite plugin loads and compiles `.diagram.ts` files on import
  - [ ] HMR triggers recompilation on file change
  - [ ] Virtual modules export compiled IR as JSON
  **QA Scenarios**:
  ```
  Scenario: Vite plugin compiles diagrams on import
    Tool: Bash (bun test)
    Steps:
      1. Create a minimal Vite dev server config with the plugin
      2. Import a .sequence.ts file
      3. Assert: module exports compiled IR object
    Expected Result: Diagram modules are compilable via Vite
    Evidence: .sisyphus/evidence/task-26-vite-plugin.txt
  ```

- [ ] 27. Implement `drawspec build:site` — Static documentation site generation

  **What to do**: Build static site from diagram files using SvelteKit. Include diagram index, SVG previews, element pages, search, diagnostics. Output is a static build deployable to any host.
  **References**: `spec.md` lines 1632-1658 (static site generation), `spec.md` lines 1038-1040 (build-site command)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 12, 26
  **Acceptance Criteria**:
  - [ ] `drawspec build:site fixtures/mvp/ --out /tmp/ds-site` produces static HTML
  - [ ] Site includes diagram index page with SVG previews
  - [ ] Site is deployable (works as static files)
  **QA Scenarios**:
  ```
  Scenario: Static site builds and serves
    Tool: Bash
    Steps:
      1. Run `drawspec build:site fixtures/mvp/ --out /tmp/ds-site`
      2. Assert: /tmp/ds-site/index.html exists
      3. Assert: SVG files embedded or linked in HTML
      4. Serve /tmp/ds-site with `bun serve` → verify page loads
    Expected Result: Deployable static documentation site
    Evidence: .sisyphus/evidence/task-27-build-site.txt
  ```

- [ ] 28. Add MDX integration examples and docs-site documentation

  **What to do**: Create examples showing DrawSpec usage in MDX, VitePress, Docusaurus, Astro. Document the viewer web component API. Write getting-started guide.
  **References**: `spec.md` lines 1564-1574 (documentation authoring targets)
  **Category**: `writing`, **Skills**: [], **Blocked By**: Tasks 12, 27
  **Acceptance Criteria**:
  - [ ] examples/ directory contains at least 2 integration examples
  - [ ] Viewer web component API documented
  - [ ] Getting-started guide exists
  **QA Scenarios**:
  ```
  Scenario: Examples are functional
    Tool: Bash
    Steps:
      1. Run `ls examples/` → at least 2 directories
      2. For each example, run `bun install && bun run build` → exit 0
    Expected Result: All examples build successfully
    Evidence: .sisyphus/evidence/task-28-examples.txt
  ```

> **STAGE 3 GATE**: Exporters produce valid output for all supported diagram types. Vite plugin works. Static site builds and is deployable. Run Final Verification Wave.

---

## STAGE 4: Editor Integration

> **Depends on**: Stage 1 complete

- [ ] 29. Create VS Code extension — Preview, diagnostics, and model explorer

  **What to do**: Create `extensions/vscode/` package. Implement preview panel (webview with viewer component). Show diagnostics from `drawspec check`. Add model explorer sidebar. Commands: preview diagram, start watch server, inspect IR.
  **References**: `spec.md` lines 1741-1758 (VS Code extension features)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 12, 15
  **Acceptance Criteria**:
  - [ ] Extension installs in VS Code
  - [ ] Preview panel opens and displays SVG
  - [ ] Diagnostics appear from `drawspec check`
  - [ ] Commands registered: preview, start watch, inspect
  **QA Scenarios**:
  ```
  Scenario: VS Code extension loads and shows preview
    Tool: Bash (vsce package + code --install-extension)
    Steps:
      1. Package extension: `cd extensions/vscode && vsce package`
      2. Install: `code --install-extension drawspec-*.vsix`
      3. Open a .arch.ts file
      4. Run "DrawSpec: Preview Diagram" command
      5. Assert: webview panel opens with SVG content
    Expected Result: Extension works end-to-end
    Evidence: .sisyphus/evidence/task-29-vscode-extension.txt
  ```

- [ ] 30. Implement @drawspec/lsp — Language server protocol augmentation

  **What to do**: Create LSP server that augments TypeScript language service. Provide diagram diagnostics, model element references, diagram outline, commands for rendering/preview. Do NOT reimplement TS features (autocomplete, rename, etc.).
  **References**: `spec.md` lines 1722-1740 (LSP responsibilities and non-responsibilities)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 8, 11
  **Acceptance Criteria**:
  - [ ] LSP server starts and connects to editor
  - [ ] Diagnostics from `drawspec check` appear in-editor
  - [ ] Document outline shows diagram elements
  **QA Scenarios**:
  ```
  Scenario: LSP provides diagnostics
    Tool: Bash (bun test)
    Steps:
      1. Start LSP server
      2. Open a .arch.ts file with known validation error
      3. Assert: diagnostic published with correct code and range
    Expected Result: LSP surfaces DrawSpec diagnostics
    Evidence: .sisyphus/evidence/task-30-lsp-diagnostics.txt
  ```

- [ ] 31. Add click-to-source in preview — Link preview elements to TypeScript source

  **What to do**: Enable clicking on an element in the preview SVG to jump to its definition in the TypeScript source file. Requires source map support.
  **References**: `spec.md` lines 1323 ("Link from preview element to source")
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 12, 30
  **Acceptance Criteria**:
  - [ ] Clicking an element in preview opens source file at correct line
  - [ ] Source references preserved through IR compilation
  **QA Scenarios**:
  ```
  Scenario: Click-to-source navigates correctly
    Tool: Playwright
    Steps:
      1. Open preview with known diagram
      2. Click on element labeled "API"
      3. Assert: editor opens .arch.ts file
      4. Assert: cursor positioned at or near the "API" element definition
    Expected Result: Click navigates to source definition
    Evidence: .sisyphus/evidence/task-31-click-to-source.png
  ```

> **STAGE 4 GATE**: VS Code extension installs and works. LSP provides diagnostics. Preview shows diagrams. Click-to-source works. Run Final Verification Wave.

---

## STAGE 5: Performance & Scale

> **Depends on**: Stage 1 complete

- [ ] 32. Implement persistent cache — Content-hash-keyed cache for compiled IR and rendered SVGs

  **What to do**: Add persistent filesystem cache for: compiled IR, layout results, rendered SVGs. Cache key = content hash + config hash + theme hash + package versions. Cache invalidation on config changes.
  **References**: `spec.md` lines 1339-1351 (caching specification)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 10, 11
  **Acceptance Criteria**:
  - [ ] Cache hit: re-rendering unchanged file skips compilation
  - [ ] Cache miss: changed file recompiles correctly
  - [ ] Cache invalidates on config/package/theme change
  **QA Scenarios**:
  ```
  Scenario: Cache hit on unchanged file
    Tool: Bash
    Steps:
      1. Render fixture → time it (cold)
      2. Render same fixture again → time it (warm)
      3. Assert: warm render >50% faster than cold
    Expected Result: Cache provides significant speedup
    Evidence: .sisyphus/evidence/task-32-cache-hit.txt
  ```

- [ ] 33. Implement incremental compilation — Dependency-aware invalidation

  **What to do**: Build dependency graph of diagram files (imports). On file change, invalidate only affected files and their dependents. Skip recompilation of unchanged modules.
  **References**: `spec.md` lines 149-160 (incremental by default design principle)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 11, 32
  **Acceptance Criteria**:
  - [ ] Dependency graph tracks imports between diagram files
  - [ ] Changing one file only recompiles it + dependents
  - [ ] Unrelated files skipped in watch mode
  **QA Scenarios**:
  ```
  Scenario: Incremental recompilation skips unrelated files
    Tool: Bash
    Steps:
      1. Create workspace with 10 diagram files (5 depend on file A, 5 independent)
      2. Modify file A
      3. Assert: only file A + 5 dependents recompiled
      4. Assert: 5 independent files not recompiled
    Expected Result: Incremental saves compilation time
    Evidence: .sisyphus/evidence/task-33-incremental.txt
  ```

- [ ] 34. Add performance benchmarks and baselines

  **What to do**: Create benchmark suite: 100 diagrams, 1000 diagrams, 10000 elements, large sequences, large graphs. Measure: cold render, warm render, cache hit, cache miss, watch-mode update. Capture baseline timings.
  **References**: `spec.md` lines 1460-1470 (performance test targets)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 32, 33
  **Acceptance Criteria**:
  - [ ] Benchmark suite runs against all scale targets
  - [ ] Baseline timings captured and saved
  - [ ] Spec targets met: <20ms compile, <50ms render, <100ms warm preview
  **QA Scenarios**:
  ```
  Scenario: Performance meets spec targets
    Tool: Bash (bun test)
    Steps:
      1. Run benchmark suite
      2. Assert: small diagram compile < 20ms
      3. Assert: small diagram render < 50ms
      4. Assert: warm preview update < 100ms
    Expected Result: All performance targets met
    Evidence: .sisyphus/evidence/task-34-benchmarks.txt
  ```

- [ ] 35. Add workspace query API — Programmatic access to architecture model

  **What to do**: Implement query API over compiled architecture model: find elements by tag, find relationships between elements, trace dependency paths, count elements by kind. Enable advanced architecture tests.
  **References**: `spec.md` lines 126-133 (model-first approach benefits)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Task 7
  **Acceptance Criteria**:
  - [ ] Query by tag: `model.query.elements({ tags: ["frontend"] })` returns matching elements
  - [ ] Query relationships: `model.query.relationships(from, to)` returns connecting edges
  - [ ] Trace paths: `model.query.path(elementA, elementB)` returns dependency chain
  **QA Scenarios**:
  ```
  Scenario: Query API finds elements by tag
    Tool: Bash (bun test)
    Steps:
      1. Create workspace with tagged elements (3 "frontend", 2 "backend", 1 "database")
      2. Query for elements with tag "frontend"
      3. Assert: returns exactly 3 elements
    Expected Result: Query API filters correctly
    Evidence: .sisyphus/evidence/task-35-query-api.txt
  ```

- [ ] 36. Implement large architecture explorer — Interactive exploration of large models

  **What to do**: Enhance viewer with: relationship filtering, element search, collapse/expand groups, performance overlay, element details panel. Handle 10000+ element workspaces.
  **References**: `spec.md` lines 1365-1372 (later preview UI features)
  **Category**: `visual-engineering`, **Skills**: [`playwright`], **Blocked By**: Tasks 12, 35
  **Acceptance Criteria**:
  - [ ] Viewer loads workspace with 1000+ elements without lag
  - [ ] Search filters elements in real-time
  - [ ] Relationship filtering shows/hides connections
  **QA Scenarios**:
  ```
  Scenario: Large workspace renders without timeout
    Tool: Playwright
    Steps:
      1. Load workspace with 1000 elements
      2. Assert: viewer renders within 5 seconds
      3. Type "API" in search → assert: results filter
    Expected Result: Explorer handles large workspaces
    Evidence: .sisyphus/evidence/task-36-large-explorer.png
  ```

- [ ] 37. Add WASM layout adapter — Optional high-performance layout via WASM

  **What to do**: Create `@drawspec/layout-wasm` package. Wrap a graph layout algorithm (e.g., Graphviz's dot via WASM) as an optional layout adapter. Benchmark against pure JS/TS layout.
  **References**: `spec.md` lines 776-788 (layout adapters), Q8 decision (optional WASM)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Task 9
  **Acceptance Criteria**:
  - [ ] WASM adapter produces valid PositionedDiagram
  - [ ] Performance benchmark shows improvement over pure JS for large graphs (500+ nodes)
  **QA Scenarios**:
  ```
  Scenario: WASM layout outperforms pure JS on large graphs
    Tool: Bash (bun test)
    Steps:
      1. Create graph with 500 nodes and 1000 edges
      2. Layout with pure JS adapter → time it
      3. Layout with WASM adapter → time it
      4. Assert: WASM is faster for this size
    Expected Result: WASM provides measurable speedup on large graphs
    Evidence: .sisyphus/evidence/task-37-wasm-benchmark.txt
  ```

> **STAGE 5 GATE**: Performance targets met (spec Section 17). Cache hit rate >80% on warm runs. Large workspaces render without timeout. Run Final Verification Wave.

---

## STAGE 6: Advanced Architecture

> **Depends on**: Stages 1 + 2 complete

- [ ] 38. Implement dynamic view generation from sequence diagrams

  **What to do**: Allow sequence diagrams to reference architecture model elements. Generate dynamic architecture views from sequence interactions. Q14 decision: "yes, but generate later" — this is "later".
  **References**: `spec.md` lines 488-495 (dynamic view type), `spec.md` lines 2112-2113 (Q13/Q14 decisions on diagram-model refs and sequence→dynamic)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 6, 7, 35
  **Acceptance Criteria**:
  - [ ] Sequence diagram can reference architecture model elements by ID
  - [ ] Dynamic view generated from sequence shows runtime interaction
  - [ ] Cross-validation: sequence messages validated against model relationships
  **QA Scenarios**:
  ```
  Scenario: Sequence references architecture model elements
    Tool: Bash (bun test)
    Steps:
      1. Create architecture workspace with Web App and API elements
      2. Create sequence diagram referencing those elements
      3. Compile both
      4. Assert: sequence participants link to architecture model elements
      5. Generate dynamic view from sequence
      6. Assert: dynamic view shows runtime interaction path
    Expected Result: Cross-referencing and dynamic view generation work
    Evidence: .sisyphus/evidence/task-38-dynamic-views.txt
  ```

- [ ] 39. Add architecture decision records (ADR) integration

  **What to do**: Allow associating ADR records with architecture elements. Support linking to external ADR files. Display ADR status in views.
  **References**: `spec.md` line 1977 ("Architecture decision records integration")
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 7, 35
  **Acceptance Criteria**:
  - [ ] Architecture elements can reference ADR files
  - [ ] ADR status displayed in architecture views
  - [ ] Query API supports finding elements by ADR status
  **QA Scenarios**:
  ```
  Scenario: ADR linked to architecture element
    Tool: Bash (bun test)
    Steps:
      1. Create element with ADR reference: `container("API", { adr: "adr-001" })`
      2. Query model for elements with ADR
      3. Assert: API element returned with ADR metadata
    Expected Result: ADR associations are queryable
    Evidence: .sisyphus/evidence/task-39-adr-integration.txt
  ```

- [ ] 40. Add drift detection hooks — Compare model to runtime state

  **What to do**: Define hooks/APIs for comparing architecture model against external sources (cloud inventory, service catalogs, OpenTelemetry). Not the integration itself — just the comparison API.
  **References**: `spec.md` line 1978 ("Drift detection hooks"), `spec.md` lines 1875-1880 (OpenTelemetry reference)
  **Category**: `deep`, **Skills**: [], **Blocked By**: Task 35
  **Acceptance Criteria**:
  - [ ] Comparison API accepts model snapshot + external state
  - [ ] Diff report: missing elements, extra elements, changed relationships
  - [ ] API is documented for integration implementers
  **QA Scenarios**:
  ```
  Scenario: Drift detection API produces diff report
    Tool: Bash (bun test)
    Steps:
      1. Create model with 5 elements
      2. Create external state with 4 elements (1 missing, 1 extra)
      3. Run drift comparison
      4. Assert: diff reports 1 missing, 1 extra element
    Expected Result: Drift API detects differences
    Evidence: .sisyphus/evidence/task-40-drift-detection.txt
  ```

- [ ] 41. Add ownership metadata and policy packs

  **What to do**: Extend architecture model with ownership metadata (team, individual, escalation). Create policy pack system: bundles of validation rules with team-specific configurations.
  **References**: `spec.md` lines 1979-1980 (ownership metadata, policy packs)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 7, 8
  **Acceptance Criteria**:
  - [ ] Elements support owner metadata: team, individual, escalation
  - [ ] Policy packs bundle rules with severity configs
  - [ ] `drawspec check --policy my-team-policy` applies policy pack
  **QA Scenarios**:
  ```
  Scenario: Policy pack applies team-specific rules
    Tool: Bash
    Steps:
      1. Create policy pack with strict rules for "Payments" team
      2. Run `drawspec check --policy payments-policy`
      3. Assert: rules applied with team-specific severity
    Expected Result: Policy packs override default rule config
    Evidence: .sisyphus/evidence/task-41-policy-packs.txt
  ```

- [ ] 42. Add service catalog integration hooks

  **What to do**: Define API for syncing architecture model with service catalogs (Backstage, OpsLevel, etc.). Not the integrations themselves — just the sync interface.
  **References**: `spec.md` line 1979 ("Service catalog integration")
  **Category**: `deep`, **Skills**: [], **Blocked By**: Tasks 7, 35
  **Acceptance Criteria**:
  - [ ] Sync interface defines: push model to catalog, pull catalog state
  - [ ] Documented for integration implementers
  - [ ] Unit tests verify interface contract
  **QA Scenarios**:
  ```
  Scenario: Sync interface contract is testable
    Tool: Bash (bun test)
    Steps:
      1. Create mock catalog adapter implementing sync interface
      2. Push architecture model to mock catalog
      3. Assert: all elements synced with correct metadata
    Expected Result: Sync interface works with mock adapter
    Evidence: .sisyphus/evidence/task-42-catalog-sync.txt
  ```

- [ ] 43. Add Structurizr and LikeC4 compatibility layers

  **What to do**: Add export to Structurizr JSON format. Add export/import for LikeC4 model concepts. Map DrawSpec elements to/from these formats.
  **References**: `spec.md` lines 1856-1874 (compatibility specifications)
  **Category**: `unspecified-high`, **Skills**: [], **Blocked By**: Tasks 7, 22, 23
  **Acceptance Criteria**:
  - [ ] Export to Structurizr JSON produces valid format
  - [ ] LikeC4 export maps DrawSpec elements to LikeC4 concepts
  - [ ] Round-trip test: DrawSpec → Structurizr → verify structure preserved
  **QA Scenarios**:
  ```
  Scenario: Structurizr JSON export is valid
    Tool: Bash (bun test)
    Steps:
      1. Create Payments workspace from spec
      2. Export to Structurizr JSON format
      3. Assert: JSON follows Structurizr schema
      4. Assert: all elements and relationships present
    Expected Result: Valid Structurizr-compatible JSON
    Evidence: .sisyphus/evidence/task-43-structurizr-export.txt
  ```

> **STAGE 6 GATE**: Dynamic views generate correctly. ADR integration works. Drift detection hooks are documented. Ownership metadata is queryable. Run Final Verification Wave.
> ALL must APPROVE before proceeding to the next stage.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run check` (biome + typecheck + test). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for viewer tasks)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

> **PR-based workflow with squash merging. No direct commits to `main`.**

### Branch & PR Rules

1. **Every task → one feature branch → one PR → squash merged to `main`**
2. Branch naming: `feat/{scope}-{short-desc}` or `fix/{scope}-{short-desc}`
3. PR title follows conventional commit format: `type(scope): description`
4. PR description MUST reference a ticket: `Closes #N` or `Part of github.com/orgs/drawspec/projects/1#N`
5. PR requires CI to pass before merge (branch protection)
6. Squash merge only — one clean commit per PR on `main`

### Conventional Commit Format

```
type(scope): description

[optional body with context]
```

**Types**: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`, `ci`, `build`
**Scopes**: package name or area (`core`, `architecture`, `uml-sequence`, `cli`, `viewer`, `layout`, `renderer-svg`, `validation`, `testkit`, `ci`, `repo`)

### Examples

```
feat(core): implement diagram IR types and deterministic IDs
fix(renderer-svg): correct text positioning for long labels
chore(ci): add GitHub Actions CI pipeline
test(uml-sequence): add golden SVG tests for alt/else fragments
docs(repo): add AGENTS.md with project conventions
```

### Executor Agent Workflow

```
For each task:
1. Create ticket in kanban board (or use existing ticket)
2. Create feature branch from main
3. Implement (atomic commits on feature branch)
4. Push branch, open PR referencing ticket
5. Wait for CI to pass
6. Squash merge PR to main
7. Update ticket status in kanban board
8. Delete feature branch
```

### PR Size Guidelines

- One PR = one concern = one task from this plan
- If a task is too large for one PR, split the TASK (not the PR)
- PRs should be reviewable in under 10 minutes
- Maximum ~300 lines of meaningful changes per PR

---

## Success Criteria

### Verification Commands
```bash
bun install --frozen-lockfile    # Expected: success
bun run check                     # Expected: biome + typecheck + test all pass
bun run build                     # Expected: all 9 packages built
drawspec check fixtures/mvp/      # Expected: 0 diagnostics
drawspec render fixtures/mvp/ --out /tmp/ds-out  # Expected: valid SVGs generated
drawspec render fixtures/mvp/ --out /tmp/ds-a && drawspec render fixtures/mvp/ --out /tmp/ds-b && diff -r /tmp/ds-a /tmp/ds-b  # Expected: no diff (deterministic)
drawspec serve fixtures/mvp/ --port 4173  # Expected: browser opens, SVG renders
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (`bun test`)
- [ ] Rendering is deterministic (byte-for-byte)
- [ ] No React imports anywhere in codebase
- [ ] No SvelteKit imports in pure TS packages
- [ ] No Node.js dependency (strict Bun)
- [ ] GitHub repo connected and CI green
- [ ] `AGENTS.md` exists with project conventions
- [ ] Kanban board tickets track all tasks
- [ ] All PRs squashed to `main`, no direct commits
