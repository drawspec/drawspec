import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Microservices Order System",
  description: "Order processing platform documented with component, sequence, state, and activity diagrams",
  content: await md`
# Microservices Order System

This example documents an order processing platform built as a set of microservices. The system handles order placement, payment processing, inventory management, and customer notifications through an event-driven architecture. Each microservice owns its data and communicates via an event bus using the saga pattern for distributed transactions.

## System Components

@diagram ./microservices-orders.component.ts "Order platform components"

The component diagram shows the four core services and how they interact with the event bus. The Order Service is the entry point, publishing events when orders are created. Payment, Inventory, and Notification services subscribe to relevant events and perform their respective tasks.

## Order Placement Flow

@diagram ./microservices-orders.sequence.ts "Order placement with saga pattern"

The sequence diagram shows the full order placement flow using the saga pattern. When a client places an order, the Order Service publishes an OrderCreated event. The Event Bus routes PaymentRequested to the Payment Service, which processes payment and publishes PaymentCompleted. The Event Bus then routes InventoryChecked to the Inventory Service, which reserves stock and publishes InventoryReserved. Finally, the Notification Service sends a confirmation to the customer.

If any step fails, compensating transactions run in reverse to undo previous steps. If payment fails, a PaymentFailed event triggers cancellation of the order and release of any reserved inventory.

## Order Lifecycle

@diagram ./microservices-orders.state.ts "Order state transitions"

The state diagram shows the valid states an order passes through from creation to delivery. An order starts in Created state, moves to PendingPayment while awaiting payment confirmation, then to Paid once payment is received. The order then moves through Fulfilling and Shipped before reaching Delivered.

Orders can be cancelled from PendingPayment if payment times out or from Paid if the order cannot be fulfilled. Once shipped, cancellation is no longer possible through the system.

## Inventory Check

@diagram ./microservices-orders.activity.ts "Inventory check activity flow"

The activity diagram shows the inventory check decision flow. When inventory is queried, the system checks whether items are in stock. If available, the system reserves the inventory and confirms the reservation. If not in stock, the system creates a backorder and notifies the customer of the expected wait time.

## Architecture Decisions

The microservices architecture allows each service to scale independently based on its workload. Payment processing is compute-intensive and benefits from dedicated resources, while the Order Service handles high throughput and can scale horizontally.

Using an event bus for communication provides loose coupling between services. Services do not call each other directly; they publish events and subscribe to events they care about. This makes it easy to add new consumers (for example, an analytics service) without modifying existing services.

The saga pattern manages distributed transactions across service boundaries. Since each service owns its database, there is no distributed transaction coordinator. Instead, each step in the saga has a corresponding compensating transaction that can undo the work if a later step fails.
`,
});
