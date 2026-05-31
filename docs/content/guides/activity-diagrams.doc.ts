import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Activity Diagrams",
  description: "Model business processes and workflow logic",
  content: await md`
# Activity Diagrams

Activity diagrams visualize the flow of actions and decisions in a process. They are ideal for modeling business workflows, algorithms, and any sequential or parallel behavior.

## Quick Start

Model a simple order processing flow:

\`\`\`typescript
import { activityDiagram } from "@drawspec/uml-activity";

export default activityDiagram("Order processing", (ctx) => {
  const { start, action, decision, end } = ctx;

  start()
    .to("Validate Order")
    .to("Check Stock");

  decision("Stock available?", () => {
    decision("Express shipping?", () => {
      action("Ship express").to("Notify customer");
      action("Send notification").to(end());
    });
  });
});
\`\`\`

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
decision("Payment approved?", () => {
  decision("Ship faster?", () => {
    action("Ship express").to("Complete");
    action("Ship standard").to("Complete");
  });
});
\`\`\`

### Flow Chaining

Connect elements using \`.to()\`. The method returns a flow builder that supports chaining:

\`\`\`typescript
start().to("Validate").to("Process").to("Ship").to(end());
\`\`\`

Add labels to flows with \`.when()\`:

\`\`\`typescript
decision("Order valid?", () => {
  action("Accept").to("Process").when("yes");
  action("Reject").to("Notify").when("no");
});
\`\`\`

## Advanced Usage

### Swimlanes

Organize activities into partitions representing different actors or systems:

\`\`\`typescript
activityDiagram("Order fulfillment", (ctx) => {
  const { start, action, decision, end } = ctx;

  start()
    .to("Receive order");

  action("Verify inventory").to("Check stock");

  decision("In stock?", () => {
    action("Pick items").to("Pack");
    action("Send to shipping").to("Notify customer").when("yes");
    action("Backorder").to("Notify customer").when("no");
  });

  decision("Express?", () => {
    action("Ship overnight").to(end()).when("yes");
    action("Ship standard").to(end()).when("no");
  });
});
\`\`\`

### Parallel Branches

Model concurrent activities using decision branches:

\`\`\`typescript
decision("Process in parallel?", () => {
  action("Task A").to("Merge").when("yes");
  action("Task B").to("Merge").when("yes");
  action("Task C").to("Merge").when("yes");
});
\`\`\`

## Complete Example

Here is a complete activity diagram for a purchase approval workflow:

\`\`\`typescript
import { activityDiagram } from "@drawspec/uml-activity";

export default activityDiagram("Purchase approval", (ctx) => {
  const { start, action, decision, end } = ctx;

  start()
    .to("Submit request")
    .to("Calculate total");

  decision("Amount exceeds limit?", () => {
    action("Route to manager").to("Manager review").when("yes");
    action("Auto-approve").to("Process order").when("no");
  });

  decision("Manager approved?", () => {
    action("Process order").to("Send confirmation").when("yes");
    action("Escalate to director").to("Director review").when("no");
  });

  decision("Director approved?", () => {
    action("Process order").to("Send confirmation").when("yes");
    action("Reject request").to("Notify requester").when("no");
  });

  action("Send confirmation").to(end());
  action("Notify requester").to(end());
});
\`\`\`
`,
});