import {
  container,
  database,
  person,
  softwareSystem,
  workspace,
} from "@drawspec/architecture";

export default workspace("Online Shop", (w) => {
  const customer = w.model.add(
    person("Customer", { description: "Browses and purchases products" })
  );

  const shop = w.model.add(
    softwareSystem("Online Shop", {
      description: "E-commerce platform",
      tags: ["internal"],
    })
  );

  const webApp = shop.add(
    container("Web App", { technology: "React + Bun" })
  );
  const api = shop.add(
    container("API", { technology: "Bun", description: "REST API" })
  );
  const db = shop.add(
    database("Product DB", { technology: "PostgreSQL" })
  );

  const payments = w.model.add(
    softwareSystem("Payment Gateway", {
      description: "Third-party payment processor",
      tags: ["external"],
    })
  );

  customer.uses(shop, "Browses products", { technology: "HTTPS" });
  shop.uses(payments, "Processes payments", {
    technology: "HTTPS",
    direction: "forward",
  });

  w.views.systemContext(shop, "context", (v) => {
    v.include(customer, shop, payments);
    v.autoLayout("left-right");
  });

  w.views.container(shop, "containers", (v) => {
    v.include(customer, webApp, api, payments);
    v.autoLayout("top-down");
  });
});
