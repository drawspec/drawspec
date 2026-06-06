import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Component Diagrams",
  description: "Model component structures and interfaces in software systems",
  content: await md`
# Component Diagrams

Component diagrams visualize the modular structure of a system. They show components, their interfaces, and the dependencies between them, making them essential for understanding service-oriented and microservice architectures.

## Quick Start

Define components with provided and required interfaces:

@diagram ./component-quick-start.component.ts "Quick start component diagram"
@source typescript ./component-quick-start.component.ts

The callback receives \`component\` and \`dependency\` functions for building the diagram.

## Key Concepts

### Components

Define components with \`component()\`. Each component can declare provided interfaces (what it offers) and required interfaces (what it needs):

\`\`\`typescript
component("PaymentService", (c) => {
  c.provides("PaymentProcessor");
  c.provides("RefundHandler");
  c.requires("TransactionLog");
  c.requires("NotificationService");
});
\`\`\`

### Lollipop Interfaces

Create standalone interfaces with \`interface_()\`. These represent the contracts that components can provide or require:

\`\`\`typescript
interface_("Database");
interface_("Cache");
interface_("MessageQueue");
\`\`\`

### Provided and Required Relationships

Connect components to interfaces using \`provides()\` and \`requires()\`:

\`\`\`typescript
provides("UserService", "UserRepository");
requires("OrderService", "PaymentGateway");
\`\`\`

### Dependency Arrows

Draw dependencies between components to show compilation or runtime relationships:

\`\`\`typescript
dependency("Frontend", "Backend");
dependency("Backend", "Database");
dependency("Backend", "Cache");
\`\`\`

## Advanced Usage

### Nested Components

Group related components together for hierarchical modeling:

\`\`\`typescript
component("E-Commerce Platform", (c) => {
  c.provides("Storefront");
  c.requires("PaymentProcessor");
  c.requires("InventoryService");
});

component("Payment Processor", (c) => {
  c.provides("PaymentGateway");
  c.requires("FraudDetection");
  c.requires("SettlementService");
});

dependency("E-Commerce Platform", "Payment Processor");
\`\`\`

### Interface Deduplication

Multiple components implementing the same interface share a single interface definition. Use consistent interface names across components:

\`\`\`typescript
component("UserService", (c) => {
  c.provides("UserCRUD");
});

component("AdminService", (c) => {
  c.provides("UserCRUD");
});
\`\`\`

## Complete Example

Here is a complete component diagram for a typical web application architecture:

@diagram ./component-complete.component.ts "Web application component diagram"
@source typescript ./component-complete.component.ts
`,
});
