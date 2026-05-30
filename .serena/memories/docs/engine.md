# @drawspec/docs — Design Decisions &amp; API Reference

## Architecture

The docs engine has two authoring paths that converge on the same Doc IR:

1. **Structured** — `defineDoc({ content: [DocBlock nodes] })` with typed JSON
2. **Freeform** — `defineDoc({ content: await md\`# markdown\` })` using tagged template

Both produce identical `DocBlock[]` arrays that flow through the same compiler and renderer.

## Self-Hosting Philosophy

DrawSpec documents itself using its own tools:
- Architecture models in `.arch.ts` files via `@drawspec/architecture`
- API docs generated from TSDoc comments
- Guides written as `.doc.ts` files using `defineDoc()` or `md`
- Docs site (SvelteKit) renders DrawSpec diagrams inline

## Key Design Decisions

- **No `h.xxx` builder pattern** — too verbose for long-form content. Rejected in favor of structured JSON nodes.
- **Both paths converge on same Doc IR** — structured and markdown produce identical output, enabling mixed authoring.
- **Markdown is an export format, not the authoring format** — consistent with DrawSpec's "structured over freeform" philosophy.
- **`md` is async** — uses dynamic `import()` for ESM portability (no `require()`). Always `await` it.
- **URL sanitization** — `sanitizeUrl()` blocks `javascript:` scheme URLs in link hrefs.
- **Accessible tabs** — rendered as `<details>/<summary>` for static HTML accessibility without JavaScript.

## Public API

| Export | Purpose |
|--------|---------|
| `defineDoc()` | Validates and constructs a DocDocument from structured content |
| `md` | Async tagged template that parses markdown → Doc IR (`Promise&lt;DocBlock[]&gt;`) |
| `initMdParser()` | Pre-initialize the markdown parser (uses remark-parse + remark-gfm) |
| `compileDoc()` | Resolves file/diagram references, validates links, produces diagnostics |
| `renderDocHtml()` | Renders compiled Doc IR to HTML with Shiki syntax highlighting |

## Doc IR Node Types

### Inline nodes
- `text`, `bold`, `italic`, `codeInline`, `link`

### Block nodes
- `heading`, `paragraph`, `codeBlock`, `diagram`, `callout`, `linkBlock`, `list`, `table`, `image`, `divider`, `tabGroup`, `badge`, `blockquote`, `thematicBreak`

## File Conventions

- `.doc.ts` — Documentation files using `defineDoc()` or `md`
- `.arch.ts` — Architecture model files using `@drawspec/architecture`
