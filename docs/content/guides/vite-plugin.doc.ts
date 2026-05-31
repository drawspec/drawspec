import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Vite Plugin",
  description: "Integrate DrawSpec into your Vite-powered projects for automatic diagram validation and HMR",
  content: await md`
# Vite Plugin

The \`@drawspec/vite-plugin\` package integrates DrawSpec diagram validation and hot module replacement into Vite-based projects. Diagrams rebuild automatically when source files change, with full HMR support for live development.

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
| \`include\` | \`string[]\` | \`["*.diagram.ts", "*.arch.ts", "*.sequence.ts"]\` | Substring filters for files to process |
| \`exclude\` | \`string[]\` | \`[]\` | Substring filters for files to skip |

### Include and Exclude Filters

Filters match if the file path contains any of the specified substrings:

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

When a diagram file changes, the plugin broadcasts an HMR update to the DrawSpec viewer if you are running \`drawspec serve\`. The viewer reloads the diagram without a full page refresh, preserving scroll position and interaction state.

HMR works automatically once the plugin is configured. No additional setup is required.

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

Next.js uses a custom webpack config, but you can still use the Vite plugin for diagram validation in development. Add it to a \`vite.config.ts\` at the project root and run \`vite\` alongside Next.js:

\`\`\`typescript
import { defineConfig } from "vite";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  plugins: [drawspecVitePlugin()],
  // Only run the plugin in dev mode
  apply: "serve",
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
      include: ["*.diagram.ts", "*.arch.ts", "*.sequence.ts"],
      exclude: ["node_modules/", ".git/", "dist/"],
    }),
  ],
  build: {
    target: "esnext",
  },
});
\`\`\`

## Validation in Dev

The plugin runs validation on diagram files during the Vite dev server startup and on each file change. Diagnostics appear in the terminal where \`vite\` is running and in the browser console. For CI validation, use \`drawspec check\` instead.
`,
});
