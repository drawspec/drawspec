import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Basic Component Diagram",
  description: "Microservices architecture with interfaces showing provides and requires",
  content: await md`
# Basic Component Diagram

Component diagrams show the organization of components in a system, their interfaces, and the dependencies between them. This is useful for visualizing the modular structure of a microservices architecture.

## Diagram

@diagram ./basic-component.component.ts "E-commerce microservices"

## Code

@source typescript ./basic-component.component.ts

## How It Works

Each component can provide interfaces that other components can use, and require interfaces from other components. The API Gateway provides the \`IRest\` interface for external clients and requires services for products, orders, and payments.

The Product Service provides its interface and requires the Product Repository for data access. The Order Service coordinates with the Inventory Service to check stock levels before confirming orders.

Dependencies between components indicate that one component depends on another. The dependency arrows show the direction of dependency, from the component that requires something to the component that provides it.

## Run It

\`\`\`bash
bunx drawspec render basic-component.component.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
