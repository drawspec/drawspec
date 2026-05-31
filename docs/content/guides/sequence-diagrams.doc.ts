import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Sequence Diagrams",
  description: "Model interactions between actors and participants over time",
  content: await md`
# Sequence Diagrams

Sequence diagrams model how actors and participants exchange messages over time. They are ideal for visualizing request-response flows, API interactions, and business processes.

## Participants

Participants represent the entities that send and receive messages. Use \`sequence()\` and call \`actor()\` for external users or \`participant()\` for systems or services:

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order flow", (ctx) => {
  const customer = ctx.actor("Customer");
  const shop = ctx.participant("Shop");
  const payments = ctx.participant("Payments");

  // ... messages go here
});
\`\`\`

Actors appear with a stick-figure icon. Participants appear as rectangles with a label.

## Messages

Messages are the arrows connecting participants. Use \`.to()\` to send a message from one participant to another:

\`\`\`typescript
export default sequence("Simple message", (ctx) => {
  const alice = ctx.actor("Alice");
  const bob = ctx.participant("Bob");

  alice.to(bob, "Hello!");
  bob.to(alice, "Hi there!");
});
\`\`\`

The first argument is the sender, second is the receiver, and the third is the message label.

## Notes

Add notes to any participant or message to provide additional context:

\`\`\`typescript
export default sequence("With notes", (ctx) => {
  const user = ctx.actor("User");
  const api = ctx.participant("API");

  user.to(api, "Request data").note("Include auth token");
  api.to(user, "Response").note("JSON payload");
});
\`\`\`

Notes attach to the element that precedes them in the chain.

## Fragments

Fragments group messages into conditional or looping behavior.

### Alternative (alt)

Use \`alt\` to show if-else branches:

\`\`\`typescript
export default sequence("Payment result", (ctx) => {
  const user = ctx.actor("User");
  const shop = ctx.participant("Shop");
  const payments = ctx.participant("Payments");

  user.to(shop, "Submit card");
  shop.to(payments, "Authorize");
  ctx
    .alt("approved", () => {
      payments.to(shop, "Approval code");
      shop.to(user, "Receipt");
    })
    .else("declined", () => {
      payments.to(shop, "Decline reason");
      shop.to(user, "Request another payment method");
    });
});
\`\`\`

### Loop

Use \`loop\` to repeat a sequence of messages:

\`\`\`typescript
export default sequence("Retry loop", (ctx) => {
  const client = ctx.actor("Client");
  const server = ctx.participant("Server");

  ctx.loop("max 3 attempts", () => {
    client.to(server, "Send request");
    server.to(client, "Response");
  });
});
\`\`\`

### Parallel (par)

Use \`par\` to show concurrent message exchanges:

\`\`\`typescript
export default sequence("Parallel fetch", (ctx) => {
  const user = ctx.actor("User");
  const catalog = ctx.participant("Catalog");
  const inventory = ctx.participant("Inventory");
  const pricing = ctx.participant("Pricing");

  user.to(catalog, "Load product page");
  ctx.par(() => {
    catalog.to(inventory, "Check stock");
    catalog.to(pricing, "Get price");
  });
  catalog.to(user, "Display product");
});
\`\`\`

## Complete Example

Here is a full sequence diagram showing a payment authorization flow:

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Payment authorization", (ctx) => {
  const user = ctx.actor("User");
  const shop = ctx.participant("Shop");
  const payments = ctx.participant("Payments");
  const ledger = ctx.participant("Ledger");

  user.to(shop, "Place order");
  shop.to(payments, "Authorize payment").note("Idempotency key included");
  payments.to(ledger, "Record transaction");
  ledger.to(payments, "Confirmed");
  payments.to(shop, "Authorization approved");
  shop.to(user, "Show confirmation");
});
\`\`\`
`,
});
