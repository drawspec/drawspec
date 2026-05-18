# DrawSpec — Agent Guidelines

## Project Overview

DrawSpec is a TypeScript-native diagram-as-code platform. Diagrams are written as TypeScript using builder APIs, compiled to an Intermediate Representation (IR), laid out, and rendered to deterministic SVGs.

- **Repo**: [github.com/drawspec/drawspec](https://github.com/drawspec/drawspec)
- **Org**: [github.com/drawspec](https://github.com/drawspec)
- **Project Board**: [github.com/orgs/drawspec/projects/1](https://github.com/orgs/drawspec/projects/1)
- **Full Plan**: `.sisyphus/plans/drawspec-platform.md`

---

## Runtime & Tooling

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

### Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  websocket: {
    open: (ws) => { ws.send("Hello, world!"); },
    message: (ws, message) => { ws.send(message); },
    close: (ws) => {}
  },
  development: { hmr: true, console: true }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

---

## GitHub Workflow

### Repository Structure

- **Main branch**: `main` (protected)
- **Branch protection**: CI must pass, squash merge only
- **Project board**: All work is tracked at [github.com/orgs/drawspec/projects/1](https://github.com/orgs/drawspec/projects/1)
- **Labels**: Each issue has a stage label (`stage-1-mvp` through `stage-6`, `verification`) and category labels

### Commit Conventions

- **Atomic commits**: One concern per commit. No mixing unrelated changes.
- **Conventional commits**: Use the `type(scope): description` format.
  - `feat(core): add DiagramDocument IR type`
  - `fix(layout): correct sequence lifeline spacing`
  - `test(uml-sequence): add fragment nesting tests`
  - `chore(ci): add typecheck job to CI`
  - `docs(readme): update installation instructions`
- **No emojis** in commit messages unless explicitly requested.

### PR Workflow

1. Each piece of work gets its own feature branch
2. PRs are self-contained: one feature, fix, or concern per PR
3. Every PR must reference a project board issue (e.g., `Closes #12` or `Refs #12`)
4. CI must pass before merge (check, typecheck, test, build)
5. **ALL Copilot review comments MUST be addressed before merge** (see Review Protocol below)
6. Squash merge to `main` — the PR title becomes the commit message
7. Delete the feature branch after merge

### Copilot Review Protocol (CRITICAL)

**NEVER merge a PR until ALL automated review feedback has been addressed.**

GitHub Copilot automatically reviews every PR. Its comments frequently catch real bugs, type safety issues, API design problems, and code quality concerns. Every Copilot comment MUST be handled before merge — no exceptions.

**Required steps before merging ANY PR:**

1. **Wait for Copilot review** — Copilot posts its review within 1-2 minutes of PR creation. Do NOT merge immediately after CI passes.
2. **Read every comment** — Check `github_pull_request_read(method="get_review_comments", ...)` or `gh pr view <N> --comments`.
3. **Address or reply to each comment:**
   - **Bug/issue found** → Fix in the same PR, push, wait for CI again
   - **Design suggestion** → Either implement it or reply explaining why it's not applicable
   - **False positive** → Reply explaining why, then resolve the thread
4. **Resolve all threads** — Every review thread must be resolved before merge
5. **For already-merged PRs** — If Copilot comments are found after merge, create a follow-up PR addressing them immediately. Reply to each comment with the follow-up PR number.

**Enforcement:**
- Branch protection should require "Require conversation resolution before merging" (requires GitHub Pro on private repos)
- The orchestrator (Atlas) MUST check `get_review_comments` before approving any merge
- Sub-agents MUST wait for `gh pr checks N --watch` AND check Copilot reviews before reporting done

**Why this matters:**
- Copilot reviews have caught: type safety issues (PR #50), API asymmetry (PR #51), coupling bugs (PR #55), name collisions (PR #56), misleading naming (PR #57), and semantic ordering violations
- Merging without addressing reviews accumulates technical debt that compounds across dependent packages

---

## Sub-Agent Isolation Protocol (CRITICAL)

**Sub-agents MUST NOT work directly in the main repo directory.** Multiple agents working on the same repo path will cause git conflicts, branch collisions, and corrupted state.

### Worktree Isolation (Required)

Every sub-agent working on a task MUST use a git worktree:

```bash
# 1. Create a worktree for this specific issue
ISSUE_NUMBER=12
WORKTREE_PATH="/tmp/drawspec-issue-${ISSUE_NUMBER}"
BRANCH_NAME="feat/issue-${ISSUE_NUMBER}/short-description"

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" main

# 2. All work happens in the worktree, NOT the main repo
cd "$WORKTREE_PATH"
bun install

# 3. Make changes, commit, push
git add -A
git commit -m "feat(scope): description"

# 4. Create PR referencing the issue
gh pr create \
  --repo drawspec/drawspec \
  --head "$BRANCH_NAME" \
  --base main \
  --title "feat(scope): description" \
  --body "Closes #${ISSUE_NUMBER}"

# 5. After PR is merged, clean up
git worktree remove "$WORKTREE_PATH"
git branch -d "$BRANCH_NAME"
```

### Why Worktrees

- **No conflicts**: Each agent gets its own filesystem path and branch
- **No locks**: Multiple agents can work in parallel without blocking each other
- **Clean state**: Worktree starts from `main`, no leftover changes from other agents
- **Easy cleanup**: Remove the worktree when done

### Worktree Rules

1. **Always** use `/tmp/drawspec-issue-{N}/` as the worktree path
2. **Always** branch from `main` (or the latest main if rebasing is needed)
3. **Always** use branch names like `feat/issue-{N}/{slug}` or `fix/issue-{N}/{slug}`
4. **Never** commit directly to `main`
5. **Never** work in the main repo directory (`/home/mekwall/repos/github/drawspec/drawspec`)
6. **Always** clean up worktree after PR is merged or closed

### Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/issue-{N}/{slug}` | `feat/issue-4/core-ir-types` |
| Fix | `fix/issue-{N}/{slug}` | `fix/issue-8/validation-rule-fix` |
| Chore | `chore/issue-{N}/{slug}` | `chore/issue-1/monorepo-init` |
| Docs | `docs/issue-{N}/{slug}` | `docs/issue-28/mdx-integration` |

---

## Task Tracking with GitHub MCP

All work is tracked via GitHub Issues linked to the [project board](https://github.com/orgs/drawspec/projects/1).

**IMPORTANT**: Sub-agents MUST use the GitHub MCP server tools (`github_*`) for all GitHub interactions — reading issues, posting comments, creating PRs, checking CI. Do NOT use the `gh` CLI for operations that have MCP equivalents. The MCP tools are the canonical interface.

### For Orchestrators (Sisyphus)

When dispatching work to sub-agents:

1. **Find the issue** on the project board matching the task
2. **Update status** to "In progress" using `gh project item-edit` before dispatching
3. **Pass the issue number** to the sub-agent as context
4. **After PR created**: Update status to "In review"
5. **After PR merged**: Update status to "Done"

### For Sub-Agents — Issue Lifecycle

Each sub-agent receives an issue number and must follow this lifecycle:

#### 1. Start Work

```
# Read the issue to understand requirements
github_issue_read(method="get", owner="drawspec", repo="drawspec", issue_number=N)

# Create worktree (see Sub-Agent Isolation Protocol)
WORKTREE="/tmp/drawspec-issue-${N}"
git worktree add "$WORKTREE" -b "feat/issue-${N}/slug" main

# Post start comment on the issue
github_add_issue_comment(
  owner="drawspec", repo="drawspec", issue_number=N,
  body="🚧 Starting work on this issue. Working in worktree at /tmp/drawspec-issue-{N}"
)
```

#### 2. Track Progress

If the work breaks into sub-steps, post a checklist comment:

```markdown
## Progress
- [x] Set up package skeleton
- [ ] Implement core types
- [ ] Add tests
- [ ] Create PR
```

Update the checklist as work progresses by editing the comment.

#### 3. Create PR

```
# Commit and push from worktree
git add -A && git commit -m "feat(scope): description" && git push

# Create PR via MCP
github_create_pull_request(
  owner="drawspec", repo="drawspec",
  title="feat(scope): description",
  head="feat/issue-N/slug", base="main",
  body="Closes #{N}\n\n## Changes\n- ..."
)
```

#### 4. Verify CI and Complete

```
# Check CI status
github_pull_request_read(method="get_check_runs", owner="drawspec", repo="drawspec", pullNumber=N)

# Post completion comment
github_add_issue_comment(
  owner="drawspec", repo="drawspec", issue_number=N,
  body="✅ PR created: #XX\n- Evidence: `.sisyphus/evidence/task-{N}-*.txt`\n- QA scenarios passed: N/N"
)
```

### GitHub MCP Tools Reference

| Action | Tool |
|--------|------|
| Read an issue | `github_issue_read(method="get", owner, repo, issue_number)` |
| Get issue comments | `github_issue_read(method="get_comments", owner, repo, issue_number)` |
| Get issue labels | `github_issue_read(method="get_labels", owner, repo, issue_number)` |
| Create a comment | `github_add_issue_comment(owner, repo, issue_number, body)` |
| Update issue | `github_issue_write(method="update", owner, repo, issue_number, labels, state)` |
| Create an issue | `github_issue_write(method="create", owner, repo, title, body, labels)` |
| List issues | `github_list_issues(owner, repo, labels, state)` |
| Search issues | `github_search_issues(query, owner, repo)` |
| Get PR details | `github_pull_request_read(method="get", owner, repo, pullNumber)` |
| Get PR diff | `github_pull_request_read(method="get_diff", owner, repo, pullNumber)` |
| Get PR files | `github_pull_request_read(method="get_files", owner, repo, pullNumber)` |
| Get CI status | `github_pull_request_read(method="get_check_runs", owner, repo, pullNumber)` |
| Get PR reviews | `github_pull_request_read(method="get_reviews", owner, repo, pullNumber)` |
| Get review comments | `github_pull_request_read(method="get_review_comments", owner, repo, pullNumber)` |
| Create PR | `github_create_pull_request(owner, repo, title, head, base, body)` |
| Merge PR | `github_merge_pull_request(owner, repo, pullNumber, merge_method)` |
| Push files | `github_push_files(owner, repo, branch, files, message)` |
| Create branch | `github_create_branch(owner, repo, branch, from_branch)` |
| Get file contents | `github_get_file_contents(owner, repo, path, ref)` |

### Project Board Operations

The project board uses GraphQL — use `gh project` CLI commands for board operations:

```bash
# Add issue to project
gh project item-add 1 --owner drawspec --url "https://github.com/drawspec/drawspec/issues/N"

# Update status field
gh project item-edit --id ITEM_ID --project-id PVT_kwDOEQY9X84BYCOF \
  --field-id STATUS_FIELD_ID --single-select-option-id OPTION_ID

# List project fields (to get field/option IDs)
gh project field-list 1 --owner drawspec --format json
```

**Board Field IDs** (cache these — they don't change):
- Project ID: `PVT_kwDOEQY9X84BYCOF`
- Status: Backlog, Ready, In progress, In review, Done
- Priority: P0, P1, P2
- Size: XS, S, M, L, XL

### Issue Labels

Each issue has a **stage label** and one or more **category labels**:

**Stage labels** (priority):
- `stage-1-mvp` — MVP foundation (P0)
- `stage-2` — UML Expansion (P1)
- `stage-3` — Exporters & Tooling (P1)
- `stage-4` — Editor Integration (P2)
- `stage-5` — Performance (P2)
- `stage-6` — Advanced Architecture (P2)
- `verification` — Final verification wave

**Category labels** (what kind of work):
- `infrastructure` — Build, CI, tooling
- `core` — @drawspec/core package
- `diagram-type` — UML/architecture diagram implementations
- `validation` — Validation rules and engine
- `layout-rendering` — Layout engines and SVG rendering
- `cli-viewer` — CLI commands and viewer
- `testing` — Test infrastructure and fixtures
- `exporter` — Export functionality
- `editor-integration` — VS Code, LSP, editor tooling
- `performance` — Caching, incremental, benchmarks
- `architecture-model` — C4 model features
- `documentation` — Docs and examples

### Project Board Fields

| Field | Values | Usage |
|-------|--------|-------|
| Status | Backlog → Ready → In progress → In review → Done | Current state |
| Priority | P0, P1, P2 | Urgency |
| Size | XS, S, M, L, XL | Estimated effort |

---

## Code Conventions

### File Organization

```
packages/
  core/           # @drawspec/core — IR, diagnostics, builders
  architecture/   # @drawspec/architecture — C4 model
  uml-sequence/   # @drawspec/uml-sequence — Sequence diagrams
  validation/     # @drawspec/validation — Rule engine
  layout/         # @drawspec/layout — Layout interfaces
  renderer-svg/   # @drawspec/renderer-svg — SVG rendering
  cli/            # @drawspec/cli — CLI binary
  viewer/         # @drawspec/viewer — Web Component viewer
  testkit/        # @drawspec/testkit — Test utilities
```

### TypeScript

- Strict mode enabled (`"strict": true`)
- Use `bun types` for type definitions
- Prefer interfaces over type aliases for object shapes
- Use `export` (not `export default`) for all public API
- Barrel exports via `src/index.ts`

### Determinism

All rendering must be **deterministic**: the same input produces byte-for-byte identical output across runs. Never use:
- `Math.random()` or `Date.now()` in rendering code
- `Map` iteration order (use sorted entries)
- Unordered collections in serialization
