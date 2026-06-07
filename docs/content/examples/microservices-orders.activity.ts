import { activityDiagram } from "@drawspec/uml-activity";

export default activityDiagram("Inventory Check", ({ start, action, decision, end }) => {
  const checkInventory = start("Check inventory");
  const queryStock = action("Query stock levels");
  const inStock = decision("In stock?");
  const reserveInventory = action("Reserve inventory");
  const confirmReservation = action("Confirm reservation");
  const createBackorder = action("Create backorder");
  const notifyBackorder = action("Notify backorder status");
  const complete = end("Complete");

  checkInventory.to(queryStock).to(inStock);
  inStock.when("Yes").to(reserveInventory).to(confirmReservation).to(complete);
  inStock.when("No").to(createBackorder).to(notifyBackorder).to(complete);
});
