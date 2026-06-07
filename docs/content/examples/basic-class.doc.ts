import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Basic Class Diagram",
  description: "Classes with fields, methods, and inheritance relationships",
  content: await md`
# Basic Class Diagram

Class diagrams show the structure of a system by modeling classes, their attributes, operations, and the relationships between them.

## Diagram

@diagram ./basic-class.class.ts "User management"

## Code

@source typescript ./basic-class.class.ts

## How It Works

The \`User\` class is the base entity with email and timestamp fields. The \`Admin\` class extends \`User\` to inherit those fields, adds role-based permissions like \`banUser\`, and implements the \`Repository\` interface, which defines the contract for data access operations.

The \`Session\` class models user sessions with token management. It uses the \`Repository\` interface for storing session data but does not implement it directly, indicating a dependency rather than an implementation relationship.

The \`UserRole\` enum defines the three possible roles in the system.

## Run It

\`\`\`bash
bunx drawspec render basic-class.class.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
