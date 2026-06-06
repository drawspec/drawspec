import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Basic Sequence Diagram",
  description: "A simple client-server interaction",
  content: await md`
# Basic Sequence Diagram

This example shows a simple client-server interaction where a user places an order and receives a confirmation.

## Diagram

@diagram ./basic-sequence.sequence.ts "Basic client-server sequence"

## Code

@source typescript ./basic-sequence.sequence.ts

## How It Works

The diagram declares three participants: a \`User\` actor, a \`Shop\` participant, and a \`Payments\` participant. The user sends a "Place order" message to the shop, which forwards an authorization request to the payments service. After the payment is authorized, the shop shows a confirmation back to the user.

The note on the authorization message indicates that an idempotency key is included, which is a common pattern for payment APIs to prevent duplicate charges.

## Run It

\`\`\`bash
bunx drawspec render basic-sequence.sequence.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
