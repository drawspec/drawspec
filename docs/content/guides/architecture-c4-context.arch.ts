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
