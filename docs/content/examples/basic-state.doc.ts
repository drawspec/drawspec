import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Basic State Diagram",
  description: "A simple traffic light with timed transitions between three states",
  content: await md`
# Basic State Diagram

State diagrams model the lifecycle of an object, showing the states it can occupy and the transitions between them triggered by events or conditions.

## Diagram

@diagram ./basic-state.state.ts "Traffic Light"

## Code

@source typescript ./basic-state.state.ts

## How It Works

The traffic light cycles through three states: Red, Green, and Yellow. An initial pseudostate marks the starting point, and a final pseudostate marks the termination of the state machine.

Each state defines outgoing transitions. When the timer fires, the traffic light advances to the next state. The \`to()\` method creates a transition, and \`label()\` adds a guard condition or action description.

The cycle repeats indefinitely since there is no transition leading to the final state in this simple model. A more complete traffic light would include pedestrian crossing states and emergency override states.

## Run It

\`\`\`bash
bunx drawspec render basic-state.state.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});