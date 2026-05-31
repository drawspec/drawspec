import { componentDiagram } from "../../../packages/uml-component/src/index.js";

export default componentDiagram("Order Platform", (d) => {
  const orderSvc = d.component("Order Service", (c) => {
    c.provides("OrderAPI");
    c.uses("Event Bus", "Publish events");
  });
  const paymentSvc = d.component("Payment Service", (c) => {
    c.provides("PaymentAPI");
    c.uses("Event Bus", "Subscribe");
  });
  const inventorySvc = d.component("Inventory Service", (c) => {
    c.provides("InventoryAPI");
    c.uses("Event Bus", "Subscribe");
  });
  const notificationSvc = d.component("Notification Service", (c) => {
    c.provides("NotificationAPI");
    c.uses("Event Bus", "Subscribe");
  });
  const eventBus = d.component("Event Bus", (c) => {
    c.provides("Message Broker");
  });

  orderSvc.uses(eventBus, "Publish OrderCreated");
  paymentSvc.uses(eventBus, "Subscribe PaymentRequested");
  inventorySvc.uses(eventBus, "Subscribe InventoryChecked");
  notificationSvc.uses(eventBus, "Subscribe OrderConfirmed");
});
