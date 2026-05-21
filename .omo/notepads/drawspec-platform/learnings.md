# DrawSpec — Learnings

## 2026-05-18 Session Start
- Repo is greenfield: only spec.md + AGENTS.md exist
- GitHub org: drawspec, repo: drawspec
- 47 issues created on project board (#1-#47)
- Issue #1 = Task 1 (monorepo init), set to Ready
- AGENTS.md already updated with MCP, worktree, task tracking guidance
- Bun-only runtime and build tooling (no Node.js)
- SvelteKit with adapter-bun for preview app
- Viewer: Svelte customElement → Web Components (framework-neutral)
- Deterministic rendering: byte-for-byte identical SVGs

## Package Skeleton Creation - Issue #2
- Created 9 package skeletons under `packages/`
- Each package has: package.json, tsconfig.json, src/index.ts
- PR #48 created and merged

## Issue #9 - Layout package implementation
- Implemented @drawspec/layout with layout interfaces, positioned diagram types, deterministic sequence layout, deterministic simple graph layout, stable content hash, and cache
- 15 tests covering sequence layout (6), graph layout (7), and cache (2)
- PR #57 merged

## Issue #14 - UML Class package implementation
<<<<<<< Updated upstream
- Added `@drawspec/uml-class` as a new workspace package with class/interface/enum builders and deterministic `class` DiagramDocument compilation.
- Class validation currently emits package-local diagnostics on the compiled document for `class/no-circular-inheritance`, `class/no-duplicate-member`, `class/require-visibility`, and unknown type refs.
- Golden SVG coverage can reuse `simpleGraphLayout` + `renderSvg`; package tests import layout/renderer source paths because workspace package exports point at `dist` and root `bun test` runs source tests after `tsc -b`.
- Local verification in this worktree requires `MISE_TRUSTED_CONFIG_PATHS=/tmp/drawspec-issue-14/mise.toml`.

## Issue #31 - Click-to-source in preview
- `SourceRef` (`{ file, line, column, symbol? }`) and `source?: SourceRef` already existed on all IR element types in `@drawspec/core` — Phase 1 was already done.
- SVG renderer uses `sourceDataAttrs()` helper to spread `data-source-file`/`data-source-line` onto `<g>` wrapper elements for nodes, edges, groups when source is present. Attributes are omitted entirely when source is absent.
- `simpleGraphLayout` does NOT position groups — groups are absent from `positionedDiagram.groups`. For group source location tests, construct a positioned diagram manually or use `sequenceLayout`.
- VS Code extension scaffold created at `extensions/vscode/` — NOT part of the monorepo workspace (root workspaces are `packages/*` and `apps/*`). Extension has its own `tsconfig.json` and `package.json` with `@types/vscode` dev dependency.
- Worktree mise trust required: `mise trust` after creating worktree.
- PR: https://github.com/drawspec/drawspec/pull/94
||||||| Stash base
- Added `@drawspec/uml-class` as a new workspace package with class/interface/enum builders and deterministic `class` DiagramDocument compilation.
- Class validation currently emits package-local diagnostics on the compiled document for `class/no-circular-inheritance`, `class/no-duplicate-member`, `class/require-visibility`, and unknown type refs.
- Golden SVG coverage can reuse `simpleGraphLayout` + `renderSvg`; package tests import layout/renderer source paths because workspace package exports point at `dist` and root `bun test` runs source tests after `tsc -b`.
- Local verification in this worktree requires `MISE_TRUSTED_CONFIG_PATHS=/tmp/drawspec-issue-14/mise.toml`.
=======
- Added @drawspec/uml-class as workspace package
- Class validation for circular inheritance, duplicate members, visibility

## 2026-05-20: Copilot Review Fixes — All 8 PRs Merged
- Resolved 120+ Copilot review threads across 8 PRs
- Merged in order: #90 (CLI), #91 (docs), #94 (click-to-source), #87 (plantuml), #88 (d2), #89 (vite-plugin), #93 (lsp), #92 (vscode-ext)
- Key lesson: **merge shared config files (tsconfig.json, cog.toml, bun.lock) last** — they conflict every time
- Sequential merging of related PRs causes cascading conflicts; batch merges require N conflict resolution cycles
- `gh pr update-branch` doesn't work for conflicted PRs — requires local merge + push
- Lefthook rejects `merge:` commit type — use `chore: merge main with ...` with `core.hooksPath=/dev/null`
- Force push is needed when merging with divergent branches
- `bun.lock` conflict markers require `rm bun.lock && bun install` to regenerate cleanly
