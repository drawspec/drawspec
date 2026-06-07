import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Basic Activity Diagram",
  description: "Order processing flow with decisions for stock check and payment verification",
  content: await md`
# Basic Activity Diagram

Activity diagrams model the flow of actions in a process, showing decisions, parallel paths, and the overall control flow from start to finish.

## Diagram

@diagram ./basic-activity.activity.ts "Order processing"

## Code

@source typescript ./basic-activity.activity.ts

## How It Works

The flow starts when an order is received. The first decision checks whether the item is in stock. If yes, the order proceeds to confirmation and payment charging. If no, the customer is notified and the process ends.

After payment is charged, a second decision verifies whether the payment succeeded. Successful payments proceed to shipping, inventory is updated, and tracking information is sent to the customer. Failed payments cancel the order.

Both the out-of-stock and payment-failure paths lead to notification before terminating at the final node, ensuring the customer is always informed of the outcome.

## Run It

\`\`\`bash
bunx drawspec render basic-activity.activity.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
