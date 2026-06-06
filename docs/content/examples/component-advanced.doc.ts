import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Advanced Component Diagram",
  description: "Enterprise system with multiple provider interfaces and dependency chains",
  content: await md`
# Advanced Component Diagram

This example shows a more complex enterprise system with nested components, multiple provider interfaces, and dependency chains. It models authentication, notification, and analytics subsystems.

## Diagram

@diagram ./component-advanced.component.ts "Enterprise system"

## Code

@source typescript ./component-advanced.component.ts

## How It Works

The Auth Service provides both \`IAuth\` and \`ISession\` interfaces, requiring the \`IUserStore\` interface. The User Store requires a database, showing a dependency chain from Auth Service to User Store to PostgreSQL.

The Notification Hub provides a single \`INotification\` interface while requiring three different provider interfaces: email, SMS, and push. This allows the notification system to delegate to specialized providers while presenting a unified interface to clients.

The Analytics Engine requires both the database and notification interfaces, enabling it to log events to the database and send alerts through the notification system.

## Run It

\`\`\`bash
bunx drawspec render component-advanced.component.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
