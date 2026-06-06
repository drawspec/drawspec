import { activityDiagram } from "../../../packages/uml-activity/src/index.js";

export default activityDiagram("Purchase approval", (ctx) => {
  const { start, action, decision, end } = ctx;
  const calculateTotal = action("Calculate total");
  const amountExceedsLimit = decision("Amount exceeds limit?");
  const managerApproved = decision("Manager approved?");
  const directorApproved = decision("Director approved?");
  const sendConfirmation = action("Send confirmation");
  const notifyRequester = action("Notify requester");

  start()
    .to("Submit request")
    .to(calculateTotal)
    .to(amountExceedsLimit);

  amountExceedsLimit.when("yes").to("Route to manager").to("Manager review").to(managerApproved);
  amountExceedsLimit.when("no").to("Auto-approve").to("Process order").to(sendConfirmation);

  managerApproved.when("yes").to("Process order").to(sendConfirmation);
  managerApproved.when("no").to("Escalate to director").to("Director review").to(directorApproved);

  directorApproved.when("yes").to("Process order").to(sendConfirmation);
  directorApproved.when("no").to("Reject request").to(notifyRequester);

  sendConfirmation.to(end());
  notifyRequester.to(end());
});
