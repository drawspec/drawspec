import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Basic Activity Diagram",
  description: "Order processing flow with decisions for stock check and payment verification",
  content: await md`
# Basic Activity Diagram

Activity diagrams model the flow of actions in a process, showing decisions, parallel paths, and the overall control flow from start to finish.

## Diagram

@diagram ./basic-activity.activity.ts "Order processing"

## Code

\`\`\`typescript
import { activityDiagram } from "@drawspec/uml-activity";

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

  checkPayment.when("yes").to(ship).to(sendTracking).to(notify);
  checkPayment.when("no").to(cancel);

  notify.to(finalNode);
  cancel.to(finalNode);
});
\`\`\`

## How It Works

The flow starts when an order is received. The first decision checks whether the item is in stock. If yes, the order proceeds to confirmation and payment charging. If no, the customer is notified and the process ends.

After payment is charged, a second decision verifies whether the payment succeeded. Successful payments proceed to shipping, where tracking information is sent to the customer. Failed payments cancel the order.

Both the out-of-stock and payment-failure paths lead to notification before terminating at the final node, ensuring the customer is always informed of the outcome.

## Run It

\`\`\`bash
bunx drawspec render basic-activity.activity.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});