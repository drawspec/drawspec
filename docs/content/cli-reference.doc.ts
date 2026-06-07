import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "CLI Reference",
  description: "Complete reference for all drawspec CLI commands",
  content: await md`
# CLI Reference

The \`drawspec\` CLI provides commands for validating, rendering, inspecting, and serving DrawSpec diagrams.

## Global Options

These options apply to all commands:

| Option | Description |
|--------|-------------|
| \`--help\`, \`-h\` | Show help output |
| \`--config\` | Path to config file |

## check

Validates diagram files without rendering. Runs all validation rules and reports diagnostics.

\`\`\`bash
drawspec check [files...] [--format pretty|json] [--policy name]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--format\` | Output format: \`pretty\` (default) or \`json\` |
| \`--policy\` | Validation policy name to use |

**Example:**

\`\`\`bash
# Check all diagrams in the current project
bunx drawspec check .

# Check specific files with JSON output
bunx drawspec check auth.sequence.ts payments.arch.ts --format json

# Run with a specific validation policy
bunx drawspec check . --policy recommended
\`\`\`

## render

Compiles diagram files and renders them to SVG output.

\`\`\`bash
drawspec render [files...] [--out dir] [--format svg] [--theme name] [--no-cache] [--cache-dir path]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--out\` | Output directory (default: \`dist\`) |
| \`--format\` | Render format (only \`svg\` is supported) |
| \`--theme\` | Theme name: \`light\` or \`dark\` |
| \`--no-cache\` | Disable render cache |
| \`--cache-dir\` | Custom cache directory path |

**Example:**

\`\`\`bash
# Render all diagrams to dist/
bunx drawspec render . --out dist

# Render with dark theme
bunx drawspec render . --theme dark --out dist

# Disable cache for fresh renders
bunx drawspec render . --no-cache
\`\`\`

## export

Exports diagrams to third-party formats: Mermaid, PlantUML, or D2.

\`\`\`bash
drawspec export <files> --format <mermaid|plantuml|d2> [--out dir] [--stdout]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--format\` | Export format: \`mermaid\`, \`plantuml\`, or \`d2\` (required) |
| \`--out\` | Output directory (default: \`dist\`) |
| \`--stdout\` | Print output to stdout instead of writing files |

**Example:**

\`\`\`bash
# Export all diagrams to Mermaid format
bunx drawspec export . --format mermaid --out dist/mmd

# Export to PlantUML and print to stdout
bunx drawspec export hello.sequence.ts --format plantuml --stdout

# Export to D2 format
bunx drawspec export . --format d2 --out dist/d2
\`\`\`

## inspect

Loads a single diagram file and outputs its internal representation for debugging.

\`\`\`bash
drawspec inspect <file> [--format json|pretty]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--format\` | Output format: \`json\` (default) or \`pretty\` |

**Example:**

\`\`\`bash
# Inspect a diagram file
bunx drawspec inspect hello.sequence.ts

# Pretty-print the output
bunx drawspec inspect hello.sequence.ts --format pretty
\`\`\`

## serve

Starts a local HTTP server that renders diagrams on demand with live reload support.

\`\`\`bash
drawspec serve [files...] [--host localhost] [--port 4173] [--debounce 80] [--open]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--host\` | Hostname to bind to (default: \`localhost\`) |
| \`--port\` | HTTP port (default: 4173) |
| \`--debounce\` | Debounce delay in milliseconds (default: 80) |
| \`--open\` | Open browser automatically |

**Example:**

\`\`\`bash
# Start dev server with all diagrams
bunx drawspec serve .

# Start and auto-open browser
bunx drawspec serve . --open

# Serve specific files
bunx drawspec serve auth.sequence.ts payments.arch.ts --port 3000
\`\`\`

## build docs

Builds the documentation site from \`.doc.ts\` source files.

\`\`\`bash
drawspec build docs [--content-dir docs/content] [--output-dir docs/dist]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--content-dir\` | Documentation source directory (default: \`docs/content\`) |
| \`--output-dir\` | Output directory (default: \`docs/dist\`) |

**Example:**

\`\`\`bash
# Build docs to docs/dist
bunx drawspec build docs

# Build to custom directory
bunx drawspec build docs --output-dir custom-docs
\`\`\`

## serve docs

Serves the documentation site locally with live rebuild on file changes.

\`\`\`bash
drawspec serve docs [--content-dir docs/content] [--output-dir docs/dist] [--host localhost] [--port 4173] [--debounce 80]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--host\` | Hostname to bind to (default: \`localhost\`) |
| \`--port\` | HTTP port (default: 4173) |
| \`--content-dir\` | Documentation source directory (default: \`docs/content\`) |
| \`--output-dir\` | Output directory (default: \`docs/dist\`) |
| \`--debounce\` | Rebuild debounce delay in milliseconds (default: 80) |

**Example:**

\`\`\`bash
# Serve docs with live reload
bunx drawspec serve docs

# Serve a custom docs source directory
bunx drawspec serve docs --content-dir docs/content --output-dir docs/dist
\`\`\`

## gallery

Generates a static HTML gallery page with all diagrams rendered as SVGs.

\`\`\`bash
drawspec gallery [--out site] [--theme name]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--out\` | Output directory (default: \`site\`) |
| \`--theme\` | Theme name: \`light\` or \`dark\` |

**Example:**

\`\`\`bash
# Generate gallery to site/
bunx drawspec gallery --out site

# Generate with dark theme
bunx drawspec gallery --theme dark --out site
\`\`\`

## build:site

Alias for \`gallery\`. Provided for backward compatibility.

\`\`\`bash
drawspec build:site [--out site] [--theme name]
\`\`\`

## build-site

Alias for \`gallery\`. Provided for backward compatibility.

\`\`\`bash
drawspec build-site [--out site] [--theme name]
\`\`\`

## watch

Watches diagram files and recompiles them on change, broadcasting updates over WebSocket to connected clients.

\`\`\`bash
drawspec watch [files...] [--port 4173] [--debounce 80]
\`\`\`

**Flags:**

| Flag | Description |
|------|-------------|
| \`--port\` | WebSocket port (default: 4173) |
| \`--debounce\` | Debounce delay in milliseconds (default: 80) |

**Example:**

\`\`\`bash
# Watch all diagrams in current directory
bunx drawspec watch .

# Watch specific files with custom debounce
bunx drawspec watch auth.sequence.ts payments.arch.ts --debounce 150
\`\`\`

## File Discovery

DrawSpec automatically discovers diagram files using these patterns:

- Explicit file paths passed as arguments
- Glob patterns (e.g., \`*.sequence.ts\`)
- Recursive scanning of directories using \`**/*.sequence.ts\`, \`**/*.arch.ts\`, \`**/*.diagram.ts\`

When given a directory or no arguments, DrawSpec scans for files matching:

\`\`\`
**/*.sequence.ts **/*.arch.ts **/*.diagram.ts
\`\`\`

## Extensibility

DrawSpec packages can register additional commands with the CLI. At startup, the CLI scans \`packages/*/package.json\` in the current workspace, imports each package entrypoint, and reads commands from a \`drawspec.commands\` export array. To add a custom command:

1. Create a workspace package under \`packages/\` with a package entrypoint
2. Export \`drawspec = { commands: [command] }\` from that entrypoint
3. Ensure each command has \`name\`, \`description\`, and \`run(parsed, config)\`
4. The CLI will automatically load and register the commands

This allows teams to add project-specific commands without forking the CLI.
`,
});
