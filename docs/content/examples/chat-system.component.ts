import { componentDiagram } from "../../../packages/uml-component/src/index.js";

export default componentDiagram("Chat Components", (d) => {
  const wsGateway = d.component("WebSocket Gateway", (c) => {
    c.provides("WSS Endpoint");
    c.uses("Message Broker", "Route messages");
  });
  const broker = d.component("Message Broker", (c) => {
    c.provides("Pub/Sub");
    c.uses("Presence Service", "Update status");
  });
  const presenceSvc = d.component("Presence Service", (c) => {
    c.provides("Online status");
    c.uses("Redis", "Cache presence");
  });
  const mediaSvc = d.component("Media Service", (c) => {
    c.provides("File upload/download");
    c.uses("S3", "Store files");
  });
  const notifDispatcher = d.component("Notification Dispatcher", (c) => {
    c.provides("Push notifications");
    c.uses("APNs/FCM", "Deliver notifications");
  });

  wsGateway.uses(broker, "Subscribe to messages");
  broker.uses(presenceSvc, "Notify presence changes");
  wsGateway.uses(mediaSvc, "Upload media");
  wsGateway.uses(notifDispatcher, "Send push");
});
