import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Vite Plugin",
  description: "Integrate DrawSpec diagram modules into Vite-powered projects with compile-time loading and HMR",
  content: await md`
# Vite Plugin

The \`@drawspec/vite-plugin\` package lets Vite import DrawSpec diagram modules as serialized \`DiagramDocument\` objects. Diagram modules rebuild automatically when source files change, with Vite HMR support for live development.

## Installation

Add the plugin as a dev dependency:

\`\`\`bash
bun add -d @drawspec/vite-plugin
\`\`\`

## Configuration

Import and add the plugin to your Vite config:

\`\`\`typescript
import { defineConfig } from "vite";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  plugins: [drawspecVitePlugin()],
});
\`\`\`

## Options

The plugin accepts an options object with these properties:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`include\` | \`string[]\` | \`undefined\` | Optional substring filters for files to process; when omitted, all diagram files are included |
| \`exclude\` | \`string[]\` | \`[]\` | Substring filters for files to skip |

### Include and Exclude Filters

Filters use \`String.includes\`, not glob matching. A file is included when its path contains one of the \`include\` substrings, and excluded when its path contains one of the \`exclude\` substrings:

\`\`\`typescript
// Only process files in a diagrams/ directory
drawspecVitePlugin({
  include: ["diagrams/"],
  exclude: ["node_modules/", ".git/"],
});
\`\`\`

## File Matching

The plugin only transforms files with these extensions by default:

- \`*.diagram.ts\`
- \`*.arch.ts\`
- \`*.sequence.ts\`

Files not matching these patterns pass through unchanged, which keeps build performance predictable even in large projects.

## Hot Module Replacement

When a diagram file changes, the plugin invalidates the corresponding virtual module in Vite's module graph. Apps that import the diagram receive a normal Vite HMR update for that module.

The plugin does not broadcast updates to \`drawspec serve\`; it only participates in Vite's own HMR pipeline.

## Framework Integrations

### SvelteKit

For SvelteKit projects, add the plugin to \`vite.config.ts\` at the project root. SvelteKit uses Vite under the hood, so the same configuration applies:

\`\`\`typescript
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  plugins: [sveltekit(), drawspecVitePlugin()],
});
\`\`\`

### Next.js

Next.js uses a custom webpack config, but you can still use the Vite plugin for diagram module compilation in development. Add it to a \`vite.config.ts\` at the project root and run \`vite\` alongside Next.js:

\`\`\`typescript
import { defineConfig } from "vite";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  plugins: [
    {
      ...drawspecVitePlugin(),
      // Only run the plugin in dev mode
      apply: "serve",
    },
  ],
});
\`\`\`

### Vanilla Vite

For plain Vite projects without a framework, the configuration shown at the top of this guide is sufficient.

## Complete Example

Here is a full \`vite.config.ts\` with DrawSpec and common options:

\`\`\`typescript
import { defineConfig } from "vite";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  plugins: [
    drawspecVitePlugin({
      include: ["/diagrams/", "/docs/content/"],
      exclude: ["node_modules/", ".git/", "dist/"],
    }),
  ],
  build: {
    target: "esnext",
  },
});
\`\`\`

## Compile Errors in Dev

The plugin compiles diagram modules and returns a serialized \`DiagramDocument\` from the virtual module. Import or compile errors are surfaced through Vite's normal error handling.

The plugin does not run validation and does not emit diagnostics to the browser console. Use \`drawspec check\` for validation in local workflows and CI.
`,
});
