import { sequence } from "@drawspec/uml-sequence";

export default sequence("Payment authorization", (ctx) => {
  const user = ctx.actor("User");
  const shop = ctx.participant("Shop");
  const payments = ctx.participant("Payments");
  const ledger = ctx.participant("Ledger");

  user.to(shop, "Place order");
  shop.to(payments, "Authorize payment").note("Idempotency key included");
  payments.to(ledger, "Record transaction");
  ledger.to(payments, "Confirmed");
  payments.to(shop, "Authorization approved");
  shop.to(user, "Show confirmation");
});
