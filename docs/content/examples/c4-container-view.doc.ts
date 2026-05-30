import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "C4 Container View",
  description: "Container-level diagram showing deployable units",
  content: await md`
# C4 Container View

This example shows a container view of a payments platform. Container views zoom into a software system to show the containers (deployable units) it contains and how they communicate.

## Diagram

@diagram ./c4-container.arch.ts "Payments platform containers"

## Code

\`\`\`typescript
import {
  container,
  database,
  person,
  softwareSystem,
  workspace,
} from "@drawspec/architecture";

export default workspace("Payments platform", (ws) => {
  const customer = ws.model.add(
    person("Customer", { description: "Buyer placing an order" })
  );
  const shop = ws.model.add(
    softwareSystem("Shop", { description: "Online storefront" })
  );

  const web = shop.add(
    container("Web App", { technology: "Bun + React", tags: ["frontend"] })
  );
  const api = shop.add(
    container("Payments API", { technology: "Bun" })
  );
  const ledger = shop.add(
    database("Ledger", { technology: "PostgreSQL" })
  );

  customer.uses(shop, "Browses catalog", { technology: "HTTPS" });
  customer.uses(web, "Places order", { technology: "HTTPS" });
  web.uses(api, "Requests payment", { technology: "HTTPS" });
  api.uses(ledger, "Stores authorization", { technology: "SQL" });

  ws.views.container(shop, "payments-containers", (view) =>
    view.include(shop, customer).autoLayout("left-right")
  );
});
\`\`\`

## How It Works

The container view reveals the internal structure of the \`Shop\` software system:

- **Web App** — A frontend container running Bun + React that the customer interacts with directly
- **Payments API** — A backend container handling payment processing logic
- **Ledger** — A PostgreSQL database storing authorization records

The relationships show the flow: the customer browses and places orders through the Web App, which calls the Payments API, which records transactions in the Ledger.

## Run It

\`\`\`bash
bunx drawspec render c4-container.arch.ts --out dist
\`\`\`
`,
});
