# DrawSpec — Agent Guidelines

DrawSpec is a TypeScript-native diagram-as-code platform. Packages under `packages/` + apps under `apps/` in a Bun monorepo.

**Read Serena memories before starting work:** `project-overview`, `conventions`, `package-dependencies`, `docs/engine`.

- **Repo**: [github.com/drawspec/drawspec](https://github.com/drawspec/drawspec)
- **Project Board**: [github.com/orgs/drawspec/projects/1](https://github.com/orgs/drawspec/projects/1)
- **Full Plan**: `.omo/plans/drawspec-platform.md`

---

## Runtime & Tooling

Default to using Bun instead of Node.js.

- `bun <file>` not `node`, `bun test` not `jest`/`vitest`, `bun install` not `npm install`
- `bunx <pkg>` not `npx`, Bun auto-loads `.env`
- `Bun.serve()` not `express`, `bun:sqlite` not `better-sqlite3`, `WebSocket` built-in not `ws`
- `Bun.file` over `node:fs` readFile/writeFile, Bun.$`ls` over execa
- Bun API docs: `node_modules/bun-types/docs/**.mdx`

---

## GitHub Workflow

### Branches & Commits
- **Main branch**: `main` (protected, squash merge only)
- **Conventional commits** enforced by cocogitto: `type(scope): description`
- **No emojis** in commit messages

### PR Workflow
1. Feature branch → PR (one feature/fix per PR, link to project board item)
2. CI must pass (check, typecheck, test, build)
3. **ALL Copilot review comments MUST be addressed before merge** — fix bugs, reply to suggestions, resolve all threads
4. Squash merge to `main`, delete feature branch
5. **NEVER push to `main` directly** — all changes go through PRs, no exceptions

### Cross-Package Changes
Changes that affect multiple packages, apps, or documentation are allowed in a single PR as long as:
- The PR description explains why the changes are coupled
- `bun run build && bun run check` passes from root
- All dependent packages, apps, docs, and Serena memories are updated in the same PR

See Serena memory `package-dependencies` for the dependency graph, and `conventions` for the documentation maintenance checklist.

### Copilot Review Protocol (CRITICAL)
- Wait for Copilot review (1-2 min after PR creation) before merging
- Address every comment: fix, reply with rationale, or resolve thread
- Copilot catches real bugs (type safety, API design, coupling issues) — never ignore

### Dependency Management
- Dependabot checks npm packages and GitHub Actions daily (`.github/dependabot.yml`)
- Dependency PRs should be reviewed and merged promptly

---

## Sub-Agent Isolation

Sub-agents MUST work in git worktrees, NOT the main repo:

```bash
WORKTREE="/tmp/drawspec-issue-${N}"
git worktree add "$WORKTREE" -b "feat/issue-${N}/slug" main
# All work in $WORKTREE
git worktree remove "$WORKTREE"  # After PR merged
```

- Always `/tmp/drawspec-issue-{N}/`, always branch from `main`
- Branch names: `feat/issue-{N}/{slug}`, `fix/issue-{N}/{slug}`, `docs/issue-{N}/{slug}`
- Never commit to `main` directly

---

## Task Tracking

All work tracked via the [project board](https://github.com/orgs/drawspec/projects/1) — **not** standalone GitHub Issues.

- Create project items directly on the board (use `gh project item-add` or the GitHub UI)
- Do **not** create standalone GH issues — the board is the single source of truth
- Branch names: `feat/{slug}`, `fix/{slug}`, `docs/{slug}` — no issue number prefix
- Use GitHub MCP tools (`github_*`) for all GitHub interactions, not `gh` CLI
- Post progress comments on PRs, update board status (Ready → In progress → In review → Done)

---

## Code Conventions

Full details in Serena memory `conventions`. Key points:

- **Strict TypeScript**, named exports only (no `export default`)
- **TSDoc on all public API** — enables docs engine API reference generation
- **Deterministic rendering** — no `Math.random()`, `Date.now()`, unsorted `Map` iteration
- **Barrel exports** via `src/index.ts`
- **Testing**: `bun test`, golden test pattern, `@drawspec/testkit` helpers
- **Testing philosophy**: ~80% coverage, test internal code only, never external dependencies
- **Linting**: Biome (not ESLint), `bun run check` = biome + typecheck + test

---

## Documentation

`@drawspec/docs` provides the documentation engine. See Serena memory `docs/engine` for full API and design decisions.

- **Structured**: `defineDoc({ content: [DocBlock nodes] })`
- **Freeform**: `defineDoc({ content: await md\`# markdown here\` })` — `md` is async, always `await`
- DrawSpec is self-documenting: architecture models in `.arch.ts`, API docs from TSDoc, guides in `.doc.ts`

---

## Serena (Code Intelligence)

Serena provides LSP-backed code intelligence. Configured at `.serena/project.yml`.

- Languages: TypeScript (primary), Svelte (viewer, preview)
- Memories: `project-overview`, `conventions`, `package-dependencies`, `docs/engine`
- Use `serena_find_symbol`, `serena_rename_symbol`, `serena_get_diagnostics_for_file`, etc.

---

## Cocogitto (Conventional Commits)

Enforces conventional commits, generates changelogs. Config in `cog.toml`.

- Validated by lefthook pre-commit + CI `commit-lint` job
- `cog verify "feat(core): add thing"`, `cog check`, `cog bump --auto`

---

## Keeping Docs Current

Update `AGENTS.md` and Serena memories whenever information changes that a freshly spawned agent with zero context would need to do its job. If it's a rule or constraint → `AGENTS.md`. If it's reference detail (lists, APIs, patterns) → Serena memory. Avoid duplication between the two.
