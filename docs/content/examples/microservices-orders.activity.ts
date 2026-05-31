import { activityDiagram } from "../../../packages/uml-activity/src/index.js";

export default activityDiagram("Inventory Check", ({ start, action, decision, end }) => {
  return [
    start("Check inventory"),
    action("Query stock levels"),
    decision("In stock?"),
    decision.to("Reserve inventory", "Yes"),
    decision.to("Create backorder", "No"),
    action("Confirm reservation"),
    end("Complete"),
    action("Notify backorder status"),
    end("Complete"),
  ];
});
