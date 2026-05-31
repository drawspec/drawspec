import { sequence } from "../../../packages/uml-sequence/src/index.js";

export default sequence("Real-Time Message Flow", (seq) => {
  const sender = seq.actor("Sender");
  const gateway = seq.participant("WebSocket Gateway");
  const broker = seq.participant("Message Broker");
  const presence = seq.participant("Presence Service");
  const recipient = seq.actor("Recipient");

  sender.to(gateway, "Send message");
  gateway.to(broker, "Publish message");
  broker.to(presence, "Check recipient status");
  presence.to(broker, "Online");
  broker.to(recipient, "Deliver message");
  gateway.to(sender, "Confirm sent");

  seq.alt("Recipient offline?", (alt) => {
    alt.if("Yes", () => {
      presence.to(broker, "Offline");
      broker.to(gateway, "Queue for delivery");
      gateway.to(gateway, "Store offline");
    });
    alt.else("No", () => {
      broker.to(recipient, "Deliver immediately");
    });
  });
});
