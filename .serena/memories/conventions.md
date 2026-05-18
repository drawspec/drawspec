# DrawSpec — Code Conventions

## File Organization
- Packages live in `packages/{name}/`
- Each package: `src/index.ts` barrel export, `src/__tests__/` for tests
- Fixtures in `fixtures/mvp/` with golden SVG/IR snapshots in `fixtures/mvp/__golden__/`
- Fixture files use `.sequence.ts` or `.arch.ts` extensions

## TypeScript
- Interfaces over type aliases for object shapes
- Named exports only (no `export default`)
- `Record<string, T>` used for options maps — access via bracket notation (TypeScript requires it for index signatures, biome `useLiteralKeys` disabled for this reason)

## Testing
- `bun test` only — test files use `.test.ts` extension
- Golden test pattern: render fixtures, compare against `__golden__/` snapshots
- `@drawspec/testkit` provides `compileDiagram`, `renderFixture`, `expectDiagram`, `expectValid`, `expectViolation`

## Determinism
- All rendering deterministic: sorted Map entries, no random, no Date.now
- IDs generated via FNV-1a hash of content
- `stableStringify()` for consistent serialization

## Commit Style
- Conventional commits: `feat(scope): description`, `fix(scope): description`
- Atomic commits — one concern per commit
- No emojis in commit messages

## PR Workflow
- Feature branch from main → PR → CI must pass → squash merge
- Branch naming: `feat/issue-{N}/{slug}`, `fix/issue-{N}/{slug}`
- ALL Copilot review comments must be addressed before merge
- Sub-agents use git worktrees at `/tmp/drawspec-issue-{N}/`
