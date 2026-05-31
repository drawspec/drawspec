import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "State Diagrams",
  description: "Model finite state machines and state transitions",
  content: await md`
# State Diagrams

State diagrams visualize the behavior of systems that transition between discrete states. They are ideal for modeling protocols, workflows, and any system with a finite number of operational modes.

## Quick Start

Create a traffic light state machine:

\`\`\`typescript
import { stateDiagram } from "@drawspec/uml-state";

export default stateDiagram("Traffic light", ({ state, initial, final }) => [
  initial(),
  state("Red", (s) => s.to("Green").label("timer")),
  state("Green", (s) => s.to("Yellow").label("timer")),
  state("Yellow", (s) => s.to("Red").label("timer")),
  final(),
]);
\`\`\`

The callback receives helpers for creating states, initial pseudostates, and final pseudostates.

## Key Concepts

### States

Define states with \`state()\`. Each state can define outgoing transitions:

\`\`\`typescript
state("Idle", (s) => {
  s.to("Processing").label("start");
  s.to("Error").label("fault");
});
\`\`\`

### Initial and Final Pseudostates

Use \`initial()\` to mark the starting point and \`final()\` for terminal states:

\`\`\`typescript
initial("start");
final("end");
\`\`\`

Without arguments, they default to "initial" and "final" labels. Multiple initial or final states are supported by passing unique names:

\`\`\`typescript
initial("init");
final("success");
final("failure");
\`\`\`

### Transitions

Connect states with transitions using the \`.to()\` method. Optionally add labels:

\`\`\`typescript
state("Active", (s) => {
  s.to("Paused", "pause");
  s.to("Stopped", "terminate");
});

state("Paused", (s) => {
  s.to("Active", "resume");
  s.to("Stopped", "stop");
});
\`\`\`

Chain \`.label()\` on the transition for more detailed annotations:

\`\`\`typescript
state("Ready", (s) =>
  s.to("Running").label("dispatch").label("process started")
);
\`\`\`

## Advanced Usage

### Guard Conditions

Model decisions by labeling transitions with guard conditions:

\`\`\`typescript
state("Authentication", (s) => {
  s.to("Authorized").label("credentials valid");
  s.to("Unauthorized").label("credentials invalid");
  s.to("Locked").label("attempts exceeded");
});
\`\`\`

### Actions

Include actions in state labels to describe what happens during a transition:

\`\`\`typescript
state("Processing", (s) => {
  s.to("Complete").label("on success / log result");
  s.to("Failed").label("on error / log error");
});
\`\`\`

### Composite States

Group related states together for complex state machines:

\`\`\`typescript
state("Online", (s) => {
  s.to("Connected").label("connect");
  s.to("Disconnected").label("disconnect");
});

state("Connected", (s) => {
  s.to("Idle").label("idle timeout");
  s.to("Busy").label("request");
});

state("Disconnected", (s) => {
  s.to("Reconnecting").label("retry");
});
\`\`\`

## Complete Example

Here is a complete state diagram for an order processing system:

\`\`\`typescript
import { stateDiagram } from "@drawspec/uml-state";

export default stateDiagram("Order processing", ({ state, initial, final }) => [
  initial("new order"),
  state("Received", (s) => s.to("Validated").label("submit")),
  state("Validated", (s) => {
    s.to("Processing").label("valid");
    s.to("Rejected").label("invalid");
  }),
  state("Processing", (s) => s.to("Shipped").label("dispatch")),
  state("Shipped", (s) => s.to("Delivered").label("deliver")),
  state("Rejected", (s) => s.to(final()).label("cancel")),
  state("Delivered", (s) => s.to(final()).label("complete")),
  final("end"),
]);
\`\`\`
`,
});