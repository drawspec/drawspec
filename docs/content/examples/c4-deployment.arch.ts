import { container, database, deploymentNode, person, softwareSystem, workspace } from "../../../packages/architecture/src/index.js";

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