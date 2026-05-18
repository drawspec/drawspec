import { sequence } from "@drawspec/uml-sequence";

export default sequence("Payment CLI", (s) => {
  const user = s.actor("User");
  const api = s.participant("API");

  user.to(api, "Pay");
});
