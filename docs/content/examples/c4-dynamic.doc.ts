import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "C4 Dynamic View",
  description: "Dynamic view showing how elements interact over time for a specific scenario",
  content: await md`
# C4 Dynamic View

Dynamic views model how elements in a container diagram interact to fulfill a specific user goal. Unlike static container views, dynamic views show the sequence of interactions and can include arbitrary elements from your model.

## Diagram

@diagram ./c4-dynamic.arch.ts "Order processing dynamic"

## Code

\`\`\`typescript
import {
  container,
  person,
  softwareSystem,
  workspace,
} from "@drawspec/architecture";

export default workspace("Order processing dynamic", (ws) => {
  const customer = ws.model.add(
    person("Customer", { description: "Places orders" })
  );

  const shop = ws.model.add(
    softwareSystem("Shop", { description: "E-commerce platform" })
  );

  const web = shop.add(
    container("Web App", { technology: "React" })
  );
  const api = shop.add(
    container("Order API", { technology: "Bun" })
  );
  const fulfillment = shop.add(
    container("Fulfillment Service", { technology: "Node.js" })
  );

  customer.uses(web, "Submits order form");
  web.uses(api, "POST /orders");
  api.uses(fulfillment, "publishes order.created");

  ws.views.container(shop, "order-processing-dynamic", (view) =>
    view.include(shop, customer).autoLayout("left-right")
  );
});
\`\`\`

## How It Works

The dynamic view shows the order submission flow from the customer's perspective. The customer submits an order form through the Web App, which calls the Order API's POST endpoint. The API publishes an \`order.created\` event to the Fulfillment Service for asynchronous processing.

This view uses the same \`ws.views.container()\` API as the container view but can be customized to show specific relationships and a particular user journey rather than all possible interactions.

## Run It

\`\`\`bash
bunx drawspec render c4-dynamic.arch.ts --out dist
\`\`\`
`,
});