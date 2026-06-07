import { sequence } from "@drawspec/uml-sequence";

export default sequence("Real-Time Message Flow", (seq) => {
  const sender = seq.actor("Sender");
  const gateway = seq.participant("WebSocket Gateway");
  const broker = seq.participant("Message Broker");
  const presence = seq.participant("Presence Service");
  const notifications = seq.participant("Notification Dispatcher");
  const recipient = seq.actor("Recipient");

  sender.to(gateway, "Send message");
  gateway.to(broker, "Publish message");
  broker.to(presence, "Check recipient status");

  seq
    .alt("Recipient online", () => {
      presence.to(broker, "Online");
      broker.to(recipient, "Deliver immediately");
      gateway.to(sender, "Confirm sent");
    })
    .else("Recipient offline", () => {
      presence.to(broker, "Offline");
      broker.to(gateway, "Queue for delivery");
      gateway.to(gateway, "Store offline");
      gateway.to(notifications, "Send push notification");
      gateway.to(sender, "Confirm queued");
    });
});
