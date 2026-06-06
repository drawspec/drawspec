import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order flow", (ctx) => {
  const customer = ctx.actor("Customer");
  const shop = ctx.participant("Shop");
  const payments = ctx.participant("Payments");

  // ... messages go here
});
