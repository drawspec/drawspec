import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Advanced State Diagram",
  description: "Order lifecycle with multiple states, guards, and terminal states",
  content: await md`
# Advanced State Diagram

This example shows a complete order lifecycle with multiple states, conditional transitions with guard labels, and terminal states for both successful completion and cancellation paths.

## Diagram

@diagram ./state-advanced.state.ts "Order Lifecycle"

## Code

\`\`\`typescript
import { stateDiagram, initial, state, final } from "@drawspec/uml-state";

export default stateDiagram("Order Lifecycle", ({ initial, state, final }) => [
  initial().to(state("Pending")),

  state("Pending", (s) => {
    s.to("Processing").label("payment received");
    s.to(state("Cancelled")).label("customer cancel");
  }),

  state("Processing", (s) => {
    s.to("Shipped").label("label printed");
    s.to(state("Cancelled")).label("refund requested");
  }),

  state("Shipped", (s) => {
    s.to("Delivered").label("carrier confirmed");
    s.to(state("Returned")).label("return initiated");
  }),

  state("Delivered", (s) => {
    s.to("Completed").label("30 days passed");
    s.to(state("Returned")).label("return requested");
  }),

  state("Completed", (s) => {
    s.to(final());
  }),

  state("Cancelled", (s) => {
    s.to(final());
  }),

  state("Returned", (s) => {
    s.to("Refunded").label("item received");
  }),

  state("Refunded", (s) => {
    s.to(final());
  }),
]);
\`\`\`

## How It Works

The order lifecycle starts in the Pending state. Once payment is received, the order moves to Processing. If the customer cancels before payment, the order goes directly to Cancelled and terminates.

From Processing, the order advances to Shipped when a shipping label is printed. Alternatively, a refund request can cancel the order from Processing as well.

The Shipped state has two possible exits: Delivered when the carrier confirms delivery, or Returned if the customer initiates a return. The Delivered state has a 30-day window before automatically completing, or it can transition to Returned if the customer requests a return.

Both Cancelled and Refunded states connect to final pseudostates, marking the end of the state machine for different termination paths.

## Run It

\`\`\`bash
bunx drawspec render state-advanced.state.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});