import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Sequence Diagram with Fragments",
  description: "Using alt/else fragments to model supported sequence control flow",
  content: await md`
# Sequence Diagram with Fragments

Fragments let you group messages into structured control flows. DrawSpec currently exposes alternative fragments through \`seq.alt().else()\`.

## Diagram

@diagram ./sequence-fragments.sequence.ts "Order processing with fragments"

## Code

@source typescript ./sequence-fragments.sequence.ts

## How It Works

The \`seq.alt()\` fragment models an if/else branch. When the condition is "authenticated", the API checks inventory directly in the database. Otherwise, it enqueues the order for manual review. Both paths eventually converge before the order is confirmed.

Additional messages continue after the alternative fragment. Here, priority handling and status updates are modeled with the supported participant \`.to()\` API.

## Run It

\`\`\`bash
bunx drawspec render sequence-fragments.sequence.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
