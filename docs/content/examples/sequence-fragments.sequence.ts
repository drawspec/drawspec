import { sequence } from "../../../packages/uml-sequence/src/index.js";

export default sequence("Order processing with fragments", (seq) => {
  const user = seq.actor("User");
  const api = seq.participant("API");
  const db = seq.participant("Database");
  const queue = seq.participant("Queue");

  user.to(api, "Submit order");

  seq.alt("authenticated", (s) => {
    s.message(api, db, "Check inventory");
    db.to(api, "In stock");
  }).else("anonymous", (s) => {
    s.message(api, queue, "Enqueue for review");
    queue.to(api, "Pending review");
  });

  seq.opt("priority", (s) => {
    s.message(api, queue, "Publish priority event");
  });

  seq.loop("3 retries", (s) => {
    s.message(api, db, "Update status");
  });

  api.to(user, "Order confirmed");
});