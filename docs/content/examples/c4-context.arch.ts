import { person, softwareSystem, workspace } from "../../packages/architecture/src/index.js";

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

  ws.views.context(shipping, "shipping-context", (view) => {
    view.include(customer, store, carrier);
    view.autoLayout("lr");
  });
});
