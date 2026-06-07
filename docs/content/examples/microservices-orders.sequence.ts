import { sequence } from "@drawspec/uml-sequence";

export default sequence("Order Placement", (seq) => {
  const client = seq.actor("Client");
  const orderSvc = seq.participant("Order Service");
  const eventBus = seq.participant("Event Bus");
  const paymentSvc = seq.participant("Payment Service");
  const inventorySvc = seq.participant("Inventory Service");
  const notificationSvc = seq.participant("Notification Service");

  client.to(orderSvc, "Place order");
  orderSvc.to(eventBus, "OrderCreated event");
  eventBus.to(paymentSvc, "PaymentRequested event");
  paymentSvc.to(eventBus, "PaymentCompleted event");
  eventBus.to(inventorySvc, "InventoryChecked event");
  inventorySvc.to(eventBus, "InventoryReserved event");
  eventBus.to(notificationSvc, "OrderConfirmed event");
  orderSvc.to(client, "Order confirmed");

  // Compensating transactions (saga pattern)
  eventBus.note("If payment fails: PaymentFailed triggers OrderCancelled and InventoryReleased");
});
