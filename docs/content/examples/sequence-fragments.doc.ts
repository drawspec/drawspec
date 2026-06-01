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

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order processing with fragments", (seq) => {
  const user = seq.actor("User");
  const api = seq.participant("API");
  const db = seq.participant("Database");
  const queue = seq.participant("Queue");

  user.to(api, "Submit order");

  seq.alt("authenticated", () => {
    api.to(db, "Check inventory");
    db.to(api, "In stock");
  }).else("anonymous", () => {
    api.to(queue, "Enqueue for review");
    queue.to(api, "Pending review");
  });

  api.to(queue, "Publish priority event when needed");
  api.to(db, "Update status after processing");

  api.to(user, "Order confirmed");
});
\`\`\`

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
