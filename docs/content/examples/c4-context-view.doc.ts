import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "C4 Context View",
  description: "System context diagram showing external actors",
  content: await md`
# C4 Context View

This example shows a system context diagram for a shipping platform. Context views zoom out to show how people and external systems interact with your software system at the highest level.

## Diagram

@diagram ./c4-context.arch.ts "Shipping system context"

## Code

\`\`\`typescript
import {
  person,
  softwareSystem,
  workspace,
} from "@drawspec/architecture";

export default workspace("Shipping platform", (ws) => {
  const customer = ws.model.add(
    person("Customer", { description: "Shopper tracking their order" })
  );
  const store = ws.model.add(
    softwareSystem("Online Store", { description: "E-commerce platform" })
  );
  const shipping = ws.model.add(
    softwareSystem("Shipping Platform", {
      description: "Tracks and manages shipments",
    })
  );
  const carrier = ws.model.add(
    softwareSystem("Carrier API", { description: "Third-party shipping carrier" })
  );

  customer.uses(store, "Places order");
  store.uses(shipping, "Creates shipment");
  shipping.uses(carrier, "Gets tracking updates");
  customer.uses(shipping, "Tracks package");

  ws.views.systemContext(shipping, "shipping-context", (view) => {
    view.include(customer, store, carrier);
    view.autoLayout("left-right");
  });
});
\`\`\`

## How It Works

The context view shows three external elements interacting with the \`Shipping Platform\` system:

- **Customer** — Places orders through the Online Store and directly tracks packages through the Shipping Platform
- **Online Store** — Initiates shipments when orders are placed
- **Carrier API** — Provides real-time tracking updates to the Shipping Platform

The view uses \`view.include()\` to show only the elements relevant to this context, and \`view.autoLayout("lr")\` arranges them left-to-right.

## Run It

\`\`\`bash
bunx drawspec render c4-context.arch.ts --out dist
\`\`\`
`,
});
