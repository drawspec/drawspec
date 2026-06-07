import { stateDiagram } from "@drawspec/uml-state";

export default stateDiagram("Order processing", ({ state, initial, final }) => [
  initial("new order"),
  state("Received", (s) => s.to("Validated").label("submit")),
  state("Validated", (s) => {
    s.to("Processing").label("valid");
    s.to("Rejected").label("invalid");
  }),
  state("Processing", (s) => s.to("Shipped").label("dispatch")),
  state("Shipped", (s) => s.to("Delivered").label("deliver")),
  state("Rejected", (s) => s.to("end").label("cancel")),
  state("Delivered", (s) => s.to("end").label("complete")),
  final("end"),
]);
