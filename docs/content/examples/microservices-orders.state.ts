import { stateDiagram } from "../../../packages/uml-state/src/index.js";

export default stateDiagram("Order Lifecycle", ({ state, initial, final }) => {
  const created = state("Created");
  const pendingPayment = state("PendingPayment");
  const paid = state("Paid");
  const fulfilling = state("Fulfilling");
  const shipped = state("Shipped");
  const delivered = state("Delivered");
  const cancelled = state("Cancelled");

  return [
    initial(created),
    created.to(pendingPayment, "Payment initiated"),
    pendingPayment.to(paid, "Payment received"),
    pendingPayment.to(cancelled, "Payment timeout"),
    paid.to(fulfilling, "Inventory reserved"),
    fulfilling.to(shipped, "Package dispatched"),
    shipped.to(delivered, "Package delivered"),
    final(delivered),
    cancelled,
  ];
});
