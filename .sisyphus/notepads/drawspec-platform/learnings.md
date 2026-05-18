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
# Package Skeleton Creation - Issue #2

## Completed
- Created 9 package skeletons under `packages/`: core, architecture, uml-sequence, validation, layout, renderer-svg, cli, viewer, testkit
- Each package has: `package.json` (with @drawspec/{name}, version 0.0.1, exports map), `tsconfig.json` (extends ../../tsconfig.base.json, composite: true), `src/index.ts` (placeholder export {})
- Created `tsconfig.base.json` at root with strict mode, ES2022 target, moduleResolution: bundler
- Updated root `tsconfig.json` to reference all 9 packages
- Created `apps/preview/` directory placeholder with README.md
- `bun install` succeeded
- `tsc -b` passed with no errors
- Pushed branch and created PR #48

## Verification
```
bun install  ✓ (208 packages installed)
tsc -b       ✓ (no output = success)
```

## PR
- https://github.com/drawspec/drawspec/pull/48

## Notes
- GitHub MCP tools (github_add_issue_comment) failed with 403 - using gh CLI instead for PR creation
- Worktree approach worked well for isolation
- Task is complete - all acceptance criteria met
## Issue #9 - Layout package implementation
- Implemented `@drawspec/layout` entirely under `packages/layout/src/`: layout interfaces, positioned diagram types, deterministic sequence layout, deterministic simple graph layout, stable content hash, and cache.
- Kept tests under `packages/layout/src/__tests__/layout.test.js` so package `tsc` build can exclude runtime test imports without touching package tsconfig.
- Sequence layout uses input order for lifeline/message semantics; graph layout uses sorted node/edge IDs for deterministic layered placement.
- `MISE_TRUSTED_CONFIG_PATHS=/tmp/drawspec-issue-9/mise.toml` is needed for local verification commands in this worktree.

## Issue #9 - Layout Package (Final Implementation)
- Previous attempt duplicated core types in `types.ts` — fixed to import from `@drawspec/core` via `workspace:*` dependency
- Duplicate/truncated test files (`sequence.test.js`, `graph-cache.test.js`) removed in favor of comprehensive `layout.test.js`
- 15 tests covering sequence layout (6), graph layout (7), and cache (2)
- FNV-1a content hash ensures deterministic cache keys (sorted object keys, no Map iteration)
- Sequence layout: lifelines at equal horizontal intervals, messages at sequential vertical intervals, fragments as boxes with operand lanes, activation bars from message flow
- Graph layout: nodes sorted by ID, depths computed via Bellman-Ford-like propagation, supports TB/LR/BT/RL directions
- PR: https://github.com/drawspec/drawspec/pull/57 — all CI checks pass
