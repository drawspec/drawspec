import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order confirmation", (seq) => {
  const user = seq.actor("User");
  const shop = seq.participant("Shop");
  const payments = seq.participant("Payments");

  user.to(shop, "Place order");
  shop.to(payments, "Authorize payment").note("Idempotency key included");
  payments.to(shop, "Authorization approved");
  shop.to(user, "Show confirmation");
});
