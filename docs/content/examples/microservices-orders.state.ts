import { stateDiagram } from "@drawspec/uml-state";

export default stateDiagram("Order Lifecycle", ({ state, initial, final }) => {
  const start = initial("start");
  const created = state("Created");
  const pendingPayment = state("PendingPayment");
  const paid = state("Paid");
  const fulfilling = state("Fulfilling");
  const shipped = state("Shipped");
  const delivered = state("Delivered");
  const cancelled = state("Cancelled");
  const complete = final("complete");

  start.to(created);
  created.to(pendingPayment, "Payment initiated");
  pendingPayment.to(paid, "Payment received");
  pendingPayment.to(cancelled, "Payment timeout");
  paid.to(fulfilling, "Inventory reserved");
  fulfilling.to(shipped, "Package dispatched");
  shipped.to(delivered, "Package delivered");
  delivered.to(complete);
  cancelled.to(complete);

  return [
    start,
    created,
    pendingPayment,
    paid,
    fulfilling,
    shipped,
    delivered,
    cancelled,
    complete,
  ];
});
