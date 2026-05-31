import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Basic Class Diagram",
  description: "Classes with fields, methods, and inheritance relationships",
  content: await md`
# Basic Class Diagram

Class diagrams show the structure of a system by modeling classes, their attributes, operations, and the relationships between them.

## Diagram

@diagram ./basic-class.class.ts "User management"

## Code

\`\`\`typescript
import {
  classDiagram,
  class_,
  interface_,
  enum_,
  implements as implements_,
  uses,
} from "@drawspec/uml-class";

export default classDiagram("User management", ({ class_, interface_, enum_, implements, uses }) => [
  class_("User", (c) => {
    c.field("id", "string");
    c.field("email", "string");
    c.field("createdAt", "Date");
    c.method("getEmail", { returnType: "string", visibility: "public" });
    c.method("updateEmail", { visibility: "public", parameters: [{ name: "email", type: "string" }] });
  }),

  class_("Admin", (c) => {
    c.field("role", "string");
    c.extends("User");
    c.method("banUser", { visibility: "public", parameters: [{ name: "userId", type: "string" }] });
    c.method("impersonate", { visibility: "public", returnType: "User" });
  }),

  class_("Session", (c) => {
    c.field("token", "string");
    c.field("expiresAt", "Date");
    c.method("isValid", { visibility: "public", returnType: "boolean" });
    c.method("refresh", { visibility: "public" });
  }),

  interface_("Repository", (i) => {
    i.method("save", { visibility: "public" });
    i.method("findById", { visibility: "public", parameters: [{ name: "id", type: "string" }] });
  }),

  enum_("UserRole", (e) => {
    e.value("Member");
    e.value("Admin");
    e.value("Guest");
  }),

  implements("Admin", "Repository"),
  uses("Session", "Repository"),
]);
\`\`\`

## How It Works

The \`User\` class is the base entity with email and timestamp fields. The \`Admin\` class extends \`User\` to inherit those fields and adds role-based permissions like \`banUser\`. Both classes implement the \`Repository\` interface, which defines the contract for data access operations.

The \`Session\` class models user sessions with token management. It uses the \`Repository\` interface for storing session data but does not implement it directly, indicating a dependency rather than an implementation relationship.

The \`UserRole\` enum defines the three possible roles in the system.

## Run It

\`\`\`bash
bunx drawspec render basic-class.class.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});