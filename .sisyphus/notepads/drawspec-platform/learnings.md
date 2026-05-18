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
