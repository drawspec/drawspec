import { container, person, softwareSystem, workspace } from "@drawspec/architecture";

export default workspace("Order processing scoped container view", (ws) => {
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

  ws.views.container(shop, "order-processing-scoped-container", (view) =>
    view.include(shop, customer).autoLayout("left-right")
  );
});
