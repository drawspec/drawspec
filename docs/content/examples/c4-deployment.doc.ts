import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "C4 Deployment View",
  description: "Deployment-level diagram showing infrastructure nodes and containers",
  content: await md`
# C4 Deployment View

Deployment views show the physical infrastructure where containers run. Each deployment node represents a distinct computing environment such as a server, CDN edge location, or cloud region.

## Diagram

@diagram ./c4-deployment.arch.ts "E-commerce deployment"

## Code

\`\`\`typescript
import {
  container,
  database,
  deploymentNode,
  person,
  softwareSystem,
  workspace,
} from "@drawspec/architecture";

export default workspace("E-commerce deployment", (ws) => {
  const customer = ws.model.add(
    person("Customer", { description: "End user shopping online" })
  );

  const shop = ws.model.add(
    softwareSystem("Shop", { description: "E-commerce storefront" })
  );

  const webTier = shop.add(
    deploymentNode("Web Tier", { technology: "AWS EC2" })
  );
  const web = webTier.add(
    container("Web App", { technology: "Bun + React" })
  );

  const appTier = shop.add(
    deploymentNode("App Tier", { technology: "AWS ECS" })
  );
  const api = appTier.add(
    container("API", { technology: "Bun + Hono" })
  );

  const dataTier = shop.add(
    deploymentNode("Data Tier", { technology: "AWS RDS" })
  );
  const db = dataTier.add(
    database("PostgreSQL", { technology: "PostgreSQL 15" })
  );

  customer.uses(web, "Browses and orders", { technology: "HTTPS" });
  web.uses(api, "REST API calls", { technology: "HTTPS" });
  api.uses(db, "CRUD operations", { technology: "TCP/IP" });

  ws.views.container(shop, "ecommerce-deployment", (view) =>
    view.include(shop, customer).autoLayout("left-right")
  );
});
\`\`\`

## How It Works

Deployment nodes nest inside software systems to represent distinct tiers or infrastructure layers. The \`Shop\` system contains three deployment nodes: Web Tier running on AWS EC2, App Tier on AWS ECS, and Data Tier on AWS RDS.

Each deployment node holds one or more containers. The Web Tier hosts the React frontend, the App Tier hosts the Hono API, and the Data Tier holds the PostgreSQL database.

Relationships between containers traverse deployment boundaries. The Web App communicates with the API over HTTPS, and the API reads and writes to the PostgreSQL database over TCP/IP.

## Run It

\`\`\`bash
bunx drawspec render c4-deployment.arch.ts --out dist
\`\`\`
`,
});