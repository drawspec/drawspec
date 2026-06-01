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

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Service health check", (seq) => {
  const monitor = seq.actor("Monitor");
  const api = seq.participant("API");
  const cache = seq.participant("Cache");
  const db = seq.participant("Database");

  monitor.note("Regular health checks every 30s");

  monitor.to(api, "GET /health");
  api.note("Health check endpoint");

  api.to(cache, "GET status");
  cache.to(api, "Cached: OK");

  seq.alt("cache hit", () => {
    cache.to(api, "Cached metrics available");
  }).else("cache miss", () => {
    api.to(db, "SELECT health FROM status");
    db.to(api, "{ status: healthy }");
  });

  api.to(api, "Aggregate metrics").note("Self-call for local aggregation");

  api.to(monitor, "200 OK + metrics");
});
\`\`\`

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
