import { stateDiagram, initial, state, final } from "../../../packages/uml-state/src/index.js";

export default stateDiagram("Order Lifecycle", ({ initial, state, final }) => [
  initial().to(state("Pending")),

  state("Pending", (s) => {
    s.to("Processing").label("payment received");
    s.to(state("Cancelled")).label("customer cancel");
  }),

  state("Processing", (s) => {
    s.to("Shipped").label("label printed");
    s.to(state("Cancelled")).label("refund requested");
  }),

  state("Shipped", (s) => {
    s.to("Delivered").label("carrier confirmed");
    s.to(state("Returned")).label("return initiated");
  }),

  state("Delivered", (s) => {
    s.to("Completed").label("30 days passed");
    s.to(state("Returned")).label("return requested");
  }),

  state("Completed", (s) => {
    s.to(final());
  }),

  state("Cancelled", (s) => {
    s.to(final());
  }),

  state("Returned", (s) => {
    s.to("Refunded").label("item received");
  }),

  state("Refunded", (s) => {
    s.to(final());
  }),
]);