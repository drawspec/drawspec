import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Architecture (C4 Model)",
  description: "Model software architecture using the C4 model",
  content: await md`
# Architecture (C4 Model)

DrawSpec's architecture package implements the C4 model for documenting software architecture. C4 stands for Context, Containers, Components, and Code — four levels of abstraction, each providing a different zoom level for your system documentation.

## Elements

The C4 model defines four structural element types.

### Person

People represent human users of your system:

\`\`\`typescript
import { person } from "@drawspec/architecture";

const customer = person("Customer", { description: "Buyer placing an order" });
\`\`\`

### Software System

Software systems are the highest-level building blocks:

\`\`\`typescript
import { softwareSystem } from "@drawspec/architecture";

const shop = softwareSystem("Shop", { description: "Online storefront" });
\`\`\`

### Container

Containers are the deployable units within a software system. A container is not a Docker container — it is something that needs to run in order for the system to function:

\`\`\`typescript
import { container } from "@drawspec/architecture";

const webApp = shop.add(container("Web App", { technology: "Bun + React" }));
const api = shop.add(container("Payments API", { technology: "Bun" }));
\`\`\`

### Database

Databases represent persistent data storage:

\`\`\`typescript
import { database } from "@drawspec/architecture";

const ledger = shop.add(database("Ledger", { technology: "PostgreSQL" }));
\`\`\`

## Relationships

Connect elements with relationships that describe how data or requests flow between them:

\`\`\`typescript
customer.uses(shop, "Browses catalog", { technology: "HTTPS" });
webApp.uses(api, "Requests payment", { technology: "HTTPS" });
api.uses(ledger, "Stores transactions", { technology: "SQL" });
\`\`\`

## Views

Views define how elements are rendered and which relationships are visible.

### Context View

The context view shows the system at its highest level — the people and external systems that interact with it:

\`\`\`typescript
import { workspace, softwareSystem, person } from "@drawspec/architecture";

export default workspace("Shipping system", (ws) => {
  const customer = ws.model.add(person("Customer"));
  const shipping = ws.model.add(softwareSystem("Shipping System"));

  customer.uses(shipping, "Tracks packages");

  ws.views.systemContext(shipping, "shipping-context", (view) => {
    view.include(customer);
    view.autoLayout("left-right");
  });
});
\`\`\`

### Container View

A container view zooms into a software system to show the containers it contains:

\`\`\`typescript
import { workspace, softwareSystem, container, database, person } from "@drawspec/architecture";

export default workspace("Payments platform", (ws) => {
  const customer = ws.model.add(person("Customer", { description: "Buyer placing an order" }));
  const shop = ws.model.add(softwareSystem("Shop", { description: "Online storefront" }));

  const web = shop.add(container("Web App", { technology: "Bun + React" }));
  const api = shop.add(container("Payments API", { technology: "Bun" }));
  const ledger = shop.add(database("Ledger", { technology: "PostgreSQL" }));

  customer.uses(shop, "Browses catalog");
  customer.uses(web, "Places order");
  web.uses(api, "Processes payment");
  api.uses(ledger, "Records transaction");

  ws.views.container(shop, "payments-containers", (view) => {
    view.include(shop, customer);
    view.autoLayout("left-right");
  });
});
\`\`\`

## Auto Layout

Views can use auto layout to automatically position elements:

\`\`\`typescript
view.autoLayout("left-right"); // left-to-right
view.autoLayout("right-left"); // right-to-left
view.autoLayout("top-down"); // top-to-bottom
view.autoLayout("bottom-up"); // bottom-to-top
\`\`\`

## Complete Example

Here is a complete architecture workspace defining a payments platform:

\`\`\`typescript
import {
  container,
  database,
  person,
  softwareSystem,
  workspace,
} from "@drawspec/architecture";

export default workspace("Payments platform", (ws) => {
  const customer = ws.model.add(person("Customer", { description: "Buyer placing an order" }));
  const shop = ws.model.add(softwareSystem("Shop", { description: "Online storefront" }));

  const web = shop.add(container("Web App", { technology: "Bun + React", tags: ["frontend"] }));
  const api = shop.add(container("Payments API", { technology: "Bun" }));
  const ledger = shop.add(database("Ledger", { technology: "PostgreSQL" }));

  customer.uses(shop, "Browses catalog", { technology: "HTTPS" });
  customer.uses(web, "Places order", { technology: "HTTPS" });
  web.uses(api, "Requests payment", { technology: "HTTPS" });
  api.uses(ledger, "Stores authorization", { technology: "SQL" });

  ws.views.container(shop, "payments-containers", (view) =>
    view.include("*").autoLayout("left-right")
  );
});
\`\`\`
`,
});
