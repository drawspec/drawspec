import { sequence } from "../../packages/uml-sequence/src";

export default sequence("Payment authorization branches", (seq) => {
  const user = seq.actor("User");
  const shop = seq.participant("Shop");
  const payments = seq.participant("Payments");

  user.to(shop, "Submit card");
  shop.to(payments, "Authorize");
  seq
    .alt("approved", () => {
      payments.to(shop, "Approval code");
      shop.to(user, "Receipt");
    })
    .else("declined", () => {
      payments.to(shop, "Decline reason");
      shop.to(user, "Request another payment method");
    });
});
