import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order flow", (ctx) => {
  const customer = ctx.actor("Customer");
  const shop = ctx.participant("Shop");
  const payments = ctx.participant("Payments");

  customer.to(shop, "Browse catalog");
  shop.to(payments, "Process payment");
  payments.to(shop, "Payment confirmed");
  shop.to(customer, "Show receipt");
});
