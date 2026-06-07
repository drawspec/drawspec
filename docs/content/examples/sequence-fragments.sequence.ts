import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order processing with fragments", (seq) => {
  const user = seq.actor("User");
  const api = seq.participant("API");
  const db = seq.participant("Database");
  const queue = seq.participant("Queue");

  user.to(api, "Submit order");

  seq.alt("authenticated", () => {
    api.to(db, "Check inventory");
    db.to(api, "In stock");
  }).else("anonymous", () => {
    api.to(queue, "Enqueue for review");
    queue.to(api, "Pending review");
  });

  api.to(queue, "Publish priority event when needed");
  api.to(db, "Update status after processing");

  api.to(user, "Order confirmed");
});
