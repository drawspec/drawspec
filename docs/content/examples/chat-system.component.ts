import { componentDiagram } from "@drawspec/uml-component";

export default componentDiagram("Chat Components", (d) => {
  d.component("WebSocket Gateway", (c) => {
    c.provides("WSS Endpoint");
    c.requires("Message Broker");
    c.requires("Media Service");
    c.requires("Notification Dispatcher");
  });
  d.component("Message Broker", (c) => {
    c.provides("Pub/Sub");
    c.requires("Presence Service");
  });
  d.component("Presence Service", (c) => {
    c.provides("Online status");
    c.requires("Redis");
  });
  d.component("Media Service", (c) => {
    c.provides("File upload/download");
    c.requires("S3");
  });
  d.component("Notification Dispatcher", (c) => {
    c.provides("Push notifications");
    c.requires("APNs/FCM");
  });

  d.dependency("WebSocket Gateway", "Message Broker", "Subscribe to messages");
  d.dependency("Message Broker", "Presence Service", "Notify presence changes");
  d.dependency("WebSocket Gateway", "Media Service", "Upload media");
  d.dependency("WebSocket Gateway", "Notification Dispatcher", "Send push");
});
