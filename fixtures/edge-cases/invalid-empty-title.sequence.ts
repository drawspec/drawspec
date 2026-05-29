import { sequence } from "../../packages/uml-sequence/src";

export default sequence("", (seq) => {
  const user = seq.actor("User");
  const shop = seq.participant("Shop");

  user.to(shop, "Checkout");
});
