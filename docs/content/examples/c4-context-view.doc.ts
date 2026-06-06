import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "C4 Context View",
  description: "System context diagram showing external actors",
  content: await md`
# C4 Context View

This example shows a system context diagram for a shipping platform. Context views zoom out to show how people and external systems interact with your software system at the highest level.

## Diagram

@diagram ./c4-context.arch.ts "Shipping system context"

## Code

@source typescript ./c4-context.arch.ts

## How It Works

The context view shows three external elements interacting with the \`Shipping Platform\` system:

- **Customer** — Places orders through the Online Store and directly tracks packages through the Shipping Platform
- **Online Store** — Initiates shipments when orders are placed
- **Carrier API** — Provides real-time tracking updates to the Shipping Platform

The view uses \`view.include()\` to show only the elements relevant to this context, and \`view.autoLayout("lr")\` arranges them left-to-right.

## Run It

\`\`\`bash
bunx drawspec render c4-context.arch.ts --out dist
\`\`\`
`,
});
