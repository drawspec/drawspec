import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Component Diagrams",
  description: "Model component structures and interfaces in software systems",
  content: await md`
# Component Diagrams

Component diagrams visualize the modular structure of a system. They show components, their interfaces, and the dependencies between them, making them essential for understanding service-oriented and microservice architectures.

## Quick Start

Define components with provided and required interfaces:

\`\`\`typescript
import { componentDiagram, interface_, provides, requires } from "@drawspec/uml-component";

export default componentDiagram("Microservices", ({ component, dependency }) => {
  const apiGateway = component("API Gateway", (c) => {
    c.provides("HTTP API");
  });

  const userService = component("User Service", (c) => {
    c.provides("User Interface");
    c.requires("Database");
  });

  const orderService = component("Order Service", (c) => {
    c.provides("Order Interface");
    c.requires("Database");
    c.requires("Payment Gateway");
  });

  dependency("API Gateway", "User Service");
  dependency("API Gateway", "Order Service");
});
\`\`\`

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

\`\`\`typescript
import { componentDiagram, interface_, provides, requires, dependency } from "@drawspec/uml-component";

export default componentDiagram("Web application", ({ component, dependency }) => {
  const webApp = component("Web Application", (c) => {
    c.provides("UserInterface");
    c.requires("APIGateway");
  });

  const apiGateway = component("API Gateway", (c) => {
    c.provides("RESTAPI");
    c.requires("AuthService");
    c.requires("BusinessLogic");
  });

  const authService = component("Auth Service", (c) => {
    c.provides("Authentication");
    c.requires("UserDatabase");
    c.requires("TokenService");
  });

  const businessLogic = component("Business Logic", (c) => {
    c.provides("OrderManagement");
    c.requires("OrderDatabase");
    c.requires("InventoryService");
  });

  const userDb = component("User Database");
  const orderDb = component("Order Database");
  const inventory = component("Inventory Service");

  dependency("Web Application", "API Gateway");
  dependency("API Gateway", "Auth Service");
  dependency("API Gateway", "Business Logic");
  dependency("Auth Service", "User Database");
  dependency("Business Logic", "Order Database");
  dependency("Business Logic", "Inventory Service");
});
\`\`\`
`,
});