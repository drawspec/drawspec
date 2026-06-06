import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Activity Diagrams",
  description: "Model business processes and workflow logic",
  content: await md`
# Activity Diagrams

Activity diagrams visualize the flow of actions and decisions in a process. They are ideal for modeling business workflows, algorithms, and any sequential or parallel behavior.

## Quick Start

Model a simple order processing flow:

@source typescript ./activity-quick-start.activity.ts
@diagram ./activity-quick-start.activity.ts "Quick start activity diagram"

The callback receives a context with \`start\`, \`action\`, \`decision\`, and \`end\` functions for building the flow.

## Key Concepts

### Control Nodes

Use \`start()\` and \`end()\` to mark the beginning and termination of an activity:

\`\`\`typescript
start("begin");
end("done");
\`\`\`

### Actions

Define actions with \`action()\`. Each action represents a unit of work:

\`\`\`typescript
action("Receive order");
action("Process payment");
action("Ship package");
\`\`\`

### Decisions

Create decision points with \`decision()\`. Use \`.when()\` to define branches:

\`\`\`typescript
const paymentApproved = decision("Payment approved?");
const shipFaster = decision("Ship faster?");

paymentApproved.when("yes").to(shipFaster);
paymentApproved.when("no").to("Request another payment method");
shipFaster.when("yes").to("Ship express").to("Complete");
shipFaster.when("no").to("Ship standard").to("Complete");
\`\`\`

### Flow Chaining

Connect elements using \`.to()\`. The method returns a flow builder that supports chaining:

\`\`\`typescript
start().to("Validate").to("Process").to("Ship").to(end());
\`\`\`

Label decision branches with \`.when()\`:

\`\`\`typescript
const orderValid = decision("Order valid?");

orderValid.when("yes").to("Accept").to("Process");
orderValid.when("no").to("Reject").to("Notify");
\`\`\`

## Advanced Usage

### Swimlanes

Organize activities into partitions representing different actors or systems:

\`\`\`typescript
activityDiagram("Order fulfillment", (ctx) => {
  const { start, action, decision, end } = ctx;
  const verifyInventory = action("Verify inventory");
  const inStock = decision("In stock?");
  const express = decision("Express?");
  const notifyCustomer = action("Notify customer");

  start()
    .to("Receive order")
    .to(verifyInventory)
    .to(inStock);

  inStock.when("yes").to("Pick items").to("Pack").to("Send to shipping").to(express);
  inStock.when("no").to("Backorder").to(notifyCustomer);

  express.when("yes").to("Ship overnight").to(notifyCustomer);
  express.when("no").to("Ship standard").to(notifyCustomer);
  notifyCustomer.to(end());
});
\`\`\`

### Parallel Branches

Model concurrent activities using decision branches:

\`\`\`typescript
const processInParallel = decision("Process in parallel?");

processInParallel.when("Task A").to("Task A").to("Merge");
processInParallel.when("Task B").to("Task B").to("Merge");
processInParallel.when("Task C").to("Task C").to("Merge");
\`\`\`

## Complete Example

Here is a complete activity diagram for a purchase approval workflow:

@source typescript ./activity-complete.activity.ts
@diagram ./activity-complete.activity.ts "Purchase approval activity diagram"
`,
});
