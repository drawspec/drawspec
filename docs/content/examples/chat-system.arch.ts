import { workspace, softwareSystem, person } from "@drawspec/architecture";

export default workspace("Chat Platform", (ws) => {
  const mobileUser = ws.model.add(person("Mobile User", { description: "User on iOS/Android app" }));
  const webUser = ws.model.add(person("Web User", { description: "User in browser" }));
  const chatApp = ws.model.add(softwareSystem("Chat Platform", { description: "Real-time messaging platform" }));

  const gateway = ws.model.add(softwareSystem("WebSocket Gateway", { description: "Handles WebSocket connections" }));
  const broker = ws.model.add(softwareSystem("Message Broker", { description: "RabbitMQ or similar" }));
  const presence = ws.model.add(softwareSystem("Presence Service", { description: "Tracks online/offline status" }));
  const media = ws.model.add(softwareSystem("Media Service", { description: "Handles file uploads" }));
  const dispatcher = ws.model.add(softwareSystem("Notification Dispatcher", { description: "Push notifications" }));

  mobileUser.uses(gateway, "Connects via WSS");
  webUser.uses(gateway, "Connects via WSS");
  gateway.uses(broker, "Publishes messages");
  broker.uses(presence, "Tracks delivery");
  gateway.uses(media, "Uploads files");
  gateway.uses(dispatcher, "Sends push notifications");

  ws.views.systemContext(chatApp, "chat-context", (view) => {
    view.include(mobileUser, webUser, gateway, broker, presence, media, dispatcher);
    view.autoLayout("left-right");
  });
});
