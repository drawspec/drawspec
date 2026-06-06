import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Advanced Sequence Diagram",
  description: "Notes, self-calls, and alternative fragments for realistic API monitoring",
  content: await md`
# Advanced Sequence Diagram

This example demonstrates several advanced sequence diagram features: notes attached to participants and messages, self-calls where an element calls itself, and alternative fragments for branching behavior.

## Diagram

@diagram ./sequence-advanced.sequence.ts "Service health check"

## Code

@source typescript ./sequence-advanced.sequence.ts

## How It Works

Notes attach metadata to participants or messages to provide context that does not participate in the control flow. The monitor has a note indicating it runs checks every 30 seconds, and the API has a note marking the health endpoint.

Self-calls represent operations that an element performs on itself. The API aggregates metrics locally before returning a response, shown as a message from the API participant back to itself.

The \`seq.alt().else()\` fragment shows cache-hit and cache-miss scenarios. Cache hits reuse cached metrics, while cache misses query the database for fresh health status.

## Run It

\`\`\`bash
bunx drawspec render sequence-advanced.sequence.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
