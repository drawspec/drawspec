import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Sequence Diagram with Fragments",
  description: "Using alt, opt, loop, and par fragments to model complex control flow",
  content: await md`
# Sequence Diagram with Fragments

Fragments let you group messages into structured control flows like alternatives, optional steps, loops, and parallel execution.

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

  seq.alt("authenticated", (s) => {
    s.message(api, db, "Check inventory");
    db.to(api, "In stock");
  }).else("anonymous", (s) => {
    s.message(api, queue, "Enqueue for review");
    queue.to(api, "Pending review");
  });

  seq.opt("priority", (s) => {
    s.message(api, queue, "Publish priority event");
  });

  seq.loop("3 retries", (s) => {
    s.message(api, db, "Update status");
  });

  api.to(user, "Order confirmed");
});
\`\`\`

## How It Works

The \`seq.alt()\` fragment models an if/else branch. When the condition is "authenticated", the API checks inventory directly in the database. Otherwise, it enqueues the order for manual review. Both paths eventually converge before the order is confirmed.

The \`seq.opt()\` fragment wraps a message that only executes under a specific condition. Here, priority orders are published to a queue for expedited handling.

The \`seq.loop()\` fragment repeats a set of messages. In this example, the status update is retried up to three times before giving up.

## Run It

\`\`\`bash
bunx drawspec render sequence-fragments.sequence.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});