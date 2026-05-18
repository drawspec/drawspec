# DrawSpec — Issues

(No issues yet)
# Issue Log

## Issue #2 - Package Skeleton Creation

### Completed Successfully
- All 9 packages created with correct structure
- TypeScript project references working

### Blockers/Gotchas
- **GitHub MCP 403**: `github_add_issue_comment` returned "403 Resource not accessible by personal access token" - used gh CLI as fallback for PR creation
  - Workaround: Use `gh pr create` instead of GitHub MCP tools when MCP fails
## Issue #9 - Layout package gotchas
- `bun run typecheck` initially failed until `MISE_TRUSTED_CONFIG_PATHS=/tmp/drawspec-issue-9/mise.toml` was set; the mise config is otherwise untrusted in the isolated worktree.
- Running package builds can create generated files if output config is stale; verify `git status --porcelain` before committing and keep commits limited to intended package source files.
