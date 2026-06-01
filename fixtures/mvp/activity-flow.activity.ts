import { activityDiagram } from "../../packages/uml-activity/src";

export default activityDiagram("Order processing workflow", ({ start, action, decision, end }) => {
  const submit = action("Submit order");
  const authorize = action("Authorize payment");
  const approved = decision("Payment approved?");
  const reject = action("Notify payment failure");
  const fork = action("Fork fulfillment work");
  const reserve = action("Reserve inventory");
  const invoice = action("Issue invoice");
  const join = action("Join fulfillment work");
  const ship = action("Ship order");
  const complete = end("complete");

  start("start").to(submit).to(authorize).to(approved);
  approved.when("Yes").to(fork);
  approved.when("No").to(reject).to(complete);
  fork.to(reserve).when("stock branch");
  fork.to(invoice).when("billing branch");
  reserve.to(join);
  invoice.to(join);
  join.to(ship).to(complete);
});
