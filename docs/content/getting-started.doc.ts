import { defineDoc, md } from "../../packages/docs/src/index.js";

export default defineDoc({
  title: "Getting Started",
  description: "Install DrawSpec and create your first diagram",
  content: await md`
# Getting Started

DrawSpec is a TypeScript-native diagram-as-code platform. Author diagrams as TypeScript, validate in CI, and render deterministic SVGs.

## Install

Create a new project and install the DrawSpec CLI along with the packages you need:

\`\`\`bash
mkdir my-diagrams && cd my-diagrams
bun init
bun add -d @drawspec/cli @drawspec/uml-sequence @drawspec/architecture
\`\`\`

## Create Your First Diagram

DrawSpec diagram files use the \`.sequence.ts\`, \`.arch.ts\`, or \`.diagram.ts\` extension. Create your first sequence diagram:

\`\`\`typescript
// hello.sequence.ts
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Hello", (seq) => {
  const alice = seq.actor("Alice");
  const bob = seq.participant("Bob");

  alice.to(bob, "Hello!");
  bob.to(alice, "Hi there!");
});
\`\`\`

## Render to SVG

Use the \`render\` command to compile your diagram and output an SVG file:

\`\`\`bash
bunx drawspec render hello.sequence.ts --out dist
\`\`\`

This compiles the diagram, runs validation checks, and writes the SVG to the \`dist/\` directory (the output filename includes a content hash).

## Preview with Live Reload

The \`serve\` command starts a local dev server with hot reload:

\`\`\`bash
bunx drawspec serve .
\`\`\`

Open \`http://localhost:4173\` to see your diagrams rendered in the browser. The page updates automatically when you save changes to any \`.sequence.ts\`, \`.arch.ts\`, or \`.diagram.ts\` file.

## Validate in CI

Use the \`check\` command to validate diagrams without rendering:

\`\`\`bash
bunx drawspec check .
\`\`\`

This runs all validation rules and reports diagnostics. It exits with code 1 if any errors are found, making it safe to use in CI pipelines.

## Next Steps

Once you have the basics down, explore more advanced topics:

- **Sequence Diagrams** — Learn about participants, messages, fragments, and notes in the [Sequence Diagrams guide](/docs/guides/sequence-diagrams)
- **Architecture (C4)** — Model systems with people, software systems, and containers in the [Architecture guide](/docs/guides/architecture-c4)
- **CLI Reference** — Full documentation of all commands and flags in the [CLI Reference](/docs/cli-reference)
- **Examples** — Copy-paste ready examples in the [Examples](/docs/examples) section
`,
});
