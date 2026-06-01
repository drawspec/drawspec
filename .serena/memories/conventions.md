# DrawSpec — Code Conventions

## File Organization
- Packages live in `packages/{name}/`
- Apps live in `apps/{name}/`
- Each package: `src/index.ts` barrel export, `src/__tests__/` for tests
- Fixtures in `fixtures/mvp/` with golden SVG/IR snapshots in `fixtures/mvp/__golden__/`
- Documentation in `.doc.ts` files using `@drawspec/docs`
- Architecture models in `.arch.ts` files using `@drawspec/architecture`

## TypeScript
- Strict mode (`"strict": true`)
- Interfaces over type aliases for object shapes
- Named exports only (no `export default`)
- `Record<string, T>` for options maps — bracket notation required for index signatures
- Barrel exports via `src/index.ts`

## TSDoc
All public API MUST have TSDoc comments:
```ts
/** Compiles a sequence diagram document into IR. */
export function compileSequenceDocument(source: string): SequenceDocument { ... }

/**
 * Layout engine interface.
 * @param graph - The graph to compute positions for.
 * @returns Positioned diagram ready for rendering.
 */
export interface LayoutEngine { ... }
```
- Every exported function/method → `/** description */`
- Complex APIs → include `@param`, `@returns`, `@example`
- This enables `@drawspec/docs` to generate API reference

## Testing
- `bun test` only — test files use `.test.ts` extension
- Golden test pattern: render fixtures, compare against `__golden__/` snapshots
- `@drawspec/testkit` provides helpers
- **~80% coverage** — aim for thorough but pragmatic coverage
- **Test internal code only** — never test external dependencies or third-party libraries
- Focus on: public API contracts, compilation pipeline, rendering determinism, edge cases

## Determinism
- All rendering deterministic: sorted Map entries, no random, no Date.now
- IDs generated via FNV-1a hash of content
- `stableStringify()` for consistent serialization

## Documentation Engine
- Two authoring modes, both converge on same Doc IR:
  - **Structured**: `defineDoc({ content: [DocBlock nodes] })`
  - **Freeform**: `defineDoc({ content: await md\`# markdown\` })`
- `md` is async — always `await` it
- See memory `docs/engine` for full design decisions and API

## Commit Style
- Conventional commits enforced by cocogitto: `feat(scope): description`, `fix(scope): description`
- Atomic commits — one concern per commit
- No emojis in commit messages

## PR Workflow
- Feature branch from main → PR → CI must pass → squash merge
- Branch naming: `feat/{slug}`, `fix/{slug}`, `docs/{slug}` — no issue number prefix
- ALL Copilot review comments must be addressed before merge
- NEVER push to main directly — all changes go through PRs, no exceptions
- Sub-agents use git worktrees at `/tmp/drawspec-{slug}/`
- Track work via [project board](https://github.com/orgs/drawspec/projects/1), NOT standalone GH issues

## Cross-Package Changes
When a change affects multiple packages/apps/docs, all updates go in the same PR.

### Dependency Updates
When changing a package, update ALL consumers:
- Check memory `package-dependencies` for the full dependency graph
- `apps/preview` depends on: core, viewer, vite-plugin, renderer-svg, layout-*, uml-* packages
- `apps/docs` depends on: docs package, core

### Documentation Maintenance Checklist
When creating, removing, or renaming packages — or changing public APIs:
- [ ] `AGENTS.md` — if project structure or tooling changed
- [ ] Serena memories (`project-overview`, `package-dependencies`, `conventions`) — if packages or deps changed
- [ ] `packages/*/src/index.ts` barrel exports — if public API changed

## Svelte (viewer, preview)
- Svelte 5 with Runes (`$state`, `$derived`, `$effect`)
- Custom elements via `customElement` for viewer
- SvelteKit with `svelte-adapter-bun` for preview app
- `{@render children()}` not `<slot />` in Svelte 5
