import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "C4 Scoped Container View",
  description: "Container view scoped to the elements involved in a specific scenario",
  content: await md`
# C4 Scoped Container View

Scoped container views focus a container diagram on the elements involved in a specific user goal. This example highlights the order submission path without claiming to use a separate dynamic-view API.

## Diagram

@diagram ./c4-dynamic.arch.ts "Order processing scoped container view"

## Code

@source typescript ./c4-dynamic.arch.ts

## How It Works

The scoped container view shows the order submission flow from the customer's perspective. The customer submits an order form through the Web App, which calls the Order API's POST endpoint. The API publishes an \`order.created\` event to the Fulfillment Service for asynchronous processing.

This view uses the same \`ws.views.container()\` API as the container view but can be customized to show specific relationships and a particular user journey rather than all possible interactions.

## Run It

\`\`\`bash
bunx drawspec render c4-dynamic.arch.ts --out dist
\`\`\`
`,
});
