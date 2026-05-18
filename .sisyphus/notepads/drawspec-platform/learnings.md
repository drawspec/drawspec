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
## Issue #8 - Validation rule engine
- Implemented `@drawspec/validation` with deterministic sorted rule execution, visitor hooks for architecture models and diagram IR, severity overrides (`off|info|warn|error`), tuple rule options, and recommended presets.
- Validation rules import core diagram/diagnostic types and define local architecture-compatible interfaces instead of importing `@drawspec/architecture`.
- Validation package needs a TypeScript reference/path to `@drawspec/core` and excludes `src/**/__tests__` from package build, matching existing package patterns.
- Final local verification passed: `bun run typecheck`, `bun test packages/validation` (44 pass), `bun run build`, and `bun run check` (106 pass).
