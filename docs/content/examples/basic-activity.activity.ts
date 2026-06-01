import { activityDiagram } from "../../../packages/uml-activity/src/index.js";

export default activityDiagram("Order processing", ({ start, action, decision, end }) => {
  const receive = action("Receive Order");
  const checkStock = decision("In Stock?");
  const confirm = action("Confirm Order");
  const charge = action("Charge Payment");
  const checkPayment = decision("Payment Success?");
  const ship = action("Ship Order");
  const notify = action("Notify Customer");
  const cancel = action("Cancel Order");
  const updateInv = action("Update Inventory");
  const sendTracking = action("Send Tracking Info");

  const finalNode = end();

  start().to(receive).to(checkStock);

  checkStock.when("yes").to(confirm).to(charge).to(checkPayment);
  checkStock.when("no").to(notify);

  checkPayment.when("yes").to(ship).to(updateInv).to(sendTracking).to(notify);
  checkPayment.when("no").to(cancel);

  notify.to(finalNode);
  cancel.to(finalNode);
});
