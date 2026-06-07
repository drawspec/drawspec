import { activityDiagram } from "@drawspec/uml-activity";

export default activityDiagram("Order processing", (ctx) => {
  const { start, action, decision, end } = ctx;
  const checkStock = action("Check Stock");
  const stockAvailable = decision("Stock available?");
  const expressShipping = decision("Express shipping?");
  const notifyCustomer = action("Notify customer");

  start()
    .to("Validate Order")
    .to(checkStock)
    .to(stockAvailable);

  stockAvailable.when("yes").to(expressShipping);
  stockAvailable.when("no").to("Backorder").to(notifyCustomer);
  expressShipping.when("yes").to("Ship express").to(notifyCustomer);
  expressShipping.when("no").to("Ship standard").to(notifyCustomer);
  notifyCustomer.to(end());
});
