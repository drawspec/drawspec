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