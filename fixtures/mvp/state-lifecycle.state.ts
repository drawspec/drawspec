import { stateDiagram } from "../../packages/uml-state/src";

export default stateDiagram("Order lifecycle", ({ initial, state, final }) => {
  const start = initial("start");
  const created = state("Created");
  const paid = state("Paid");
  const shipped = state("Shipped");
  const delivered = state("Delivered");
  const end = final("end");

  start.to(created).label("create order");
  created.to(paid).label("pay [payment authorized]");
  paid.to(shipped).label("ship [inventory allocated]");
  shipped.to(delivered).label("deliver [signature captured]");
  delivered.to(end).label("close order");

  return [start, created, paid, shipped, delivered, end];
});
