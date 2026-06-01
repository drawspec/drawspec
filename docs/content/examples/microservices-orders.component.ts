import { componentDiagram } from "../../../packages/uml-component/src/index.js";

export default componentDiagram("Order Platform", (d) => {
  d.component("Order Service", (c) => {
    c.provides("OrderAPI");
    c.requires("Event Bus");
  });
  d.component("Payment Service", (c) => {
    c.provides("PaymentAPI");
    c.requires("Event Bus");
  });
  d.component("Inventory Service", (c) => {
    c.provides("InventoryAPI");
    c.requires("Event Bus");
  });
  d.component("Notification Service", (c) => {
    c.provides("NotificationAPI");
    c.requires("Event Bus");
  });
  d.component("Event Bus", (c) => {
    c.provides("Message Broker");
  });

  d.dependency("Order Service", "Event Bus", "Publish OrderCreated");
  d.dependency("Event Bus", "Payment Service", "Route PaymentRequested");
  d.dependency("Event Bus", "Inventory Service", "Route InventoryChecked");
  d.dependency("Event Bus", "Notification Service", "Route OrderConfirmed");
});
