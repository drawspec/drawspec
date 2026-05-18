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
## Issue #8 - Validation package gotchas
- `bun run typecheck` and `bun run build` can fail under mise unless run with `MISE_TRUSTED_CONFIG_PATHS=/tmp/drawspec-issue-8/mise.toml` in an untrusted worktree.
- Adding tests under a package `src/` requires excluding `src/**/__tests__/**/*.ts` from that package's `tsconfig.json`; otherwise package builds typecheck Bun test files.
