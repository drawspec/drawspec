import { container, person, softwareSystem, workspace } from "../../packages/architecture/src";

export default workspace("Invalid missing technology", (ws) => {
  const customer = ws.model.add(person("Customer"));
  const shop = ws.model.add(softwareSystem("Shop"));
  const checkout = ws.model.add(container("Checkout API"));

  customer.uses(checkout, "Starts checkout", { technology: "HTTPS" });
  ws.views.systemContext(shop, "invalid-missing-technology", (view) =>
    view.include("*").autoLayout("left-right")
  );
});
