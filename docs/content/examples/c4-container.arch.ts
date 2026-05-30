import { container, database, person, softwareSystem, workspace } from "../../../packages/architecture/src/index.js";

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
