# DrawSpec — Decisions

## 2026-05-18 Initial Setup
- All 47 plan tasks map 1:1 to GitHub issues (#1-#47)
- Issue #1 is set to "Ready" status on project board
- Sub-agents use git worktrees at /tmp/drawspec-issue-{N}/
- Branch naming: feat/issue-{N}/{slug}
- Each PR references its issue: "Closes #{N}"
