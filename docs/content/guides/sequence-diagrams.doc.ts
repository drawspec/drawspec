import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Sequence Diagrams",
  description: "Model interactions between actors and participants over time",
  content: await md`
# Sequence Diagrams

Sequence diagrams model how actors and participants exchange messages over time. They are ideal for visualizing request-response flows, API interactions, and business processes.

## Participants

Participants represent the entities that send and receive messages. Use \`seq.actor()\` for external users and \`seq.participant()\` for systems or services:

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order flow", (seq) => {
  const customer = seq.actor("Customer");
  const shop = seq.participant("Shop");
  const payments = seq.participant("Payments");

  // ... messages go here
});
\`\`\`

Actors appear with a stick-figure icon. Participants appear as rectangles with a label.

## Messages

Messages are the arrows connecting participants. Use \`.to()\` to send a message from one participant to another:

\`\`\`typescript
export default sequence("Simple message", (seq) => {
  const alice = seq.actor("Alice");
  const bob = seq.participant("Bob");

  alice.to(bob, "Hello!");
  bob.to(alice, "Hi there!");
});
\`\`\`

The first argument is the sender, second is the receiver, and the third is the message label.

## Notes

Add notes to any participant or message to provide additional context:

\`\`\`typescript
export default sequence("With notes", (seq) => {
  const user = seq.actor("User");
  const api = seq.participant("API");

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
export default sequence("Payment result", (seq) => {
  const user = seq.actor("User");
  const shop = seq.participant("Shop");
  const payments = seq.participant("Payments");

  user.to(shop, "Submit card");
  shop.to(payments, "Authorize");
  seq
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

Use \`loop\` to show repeated behavior:

\`\`\`typescript
export default sequence("Retry logic", (seq) => {
  const client = seq.actor("Client");
  const api = seq.participant("API");

  seq.loop("up to 3 attempts", () => {
    client.to(api, "Request");
    api.to(client, "Response");
  });
});
\`\`\`

### Optional (opt)

Use \`opt\` for conditional behavior that may or may not happen:

\`\`\`typescript
export default sequence("With optional", (seq) => {
  const user = seq.actor("User");
  const app = seq.participant("App");

  user.to(app, "Use app");
  seq.opt("premium feature", () => {
    app.to(user, "Show upgrade prompt");
  });
});
\`\`\`

### Parallel (par)

Use \`par\` to show concurrent behavior:

\`\`\`typescript
export default sequence("Parallel tasks", (seq) => {
  const user = seq.actor("User");
  const email = seq.participant("Email Service");
  const sms = seq.participant("SMS Service");

  user.to(email, "Send email").to(sms, "Send SMS");
  seq.par("notify in parallel", () => {
    email.to(user, "Email sent");
    sms.to(user, "SMS delivered");
  });
});
\`\`\`

## Complete Example

Here is a full sequence diagram showing a payment authorization flow:

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Payment authorization", (seq) => {
  const user = seq.actor("User");
  const shop = seq.participant("Shop");
  const payments = seq.participant("Payments");
  const ledger = seq.participant("Ledger");

  user.to(shop, "Place order");
  shop.to(payments, "Authorize payment").note("Idempotency key included");
  seq.loop("for each transaction", () => {
    payments.to(ledger, "Record transaction");
    ledger.to(payments, "Confirmed");
  });
  payments.to(shop, "Authorization approved");
  shop.to(user, "Show confirmation");
});
\`\`\`
`,
});
