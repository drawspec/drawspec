import { workspace, softwareSystem, container, database, person } from "../../../packages/architecture/src/index.js";

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
