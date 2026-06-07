import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Class Diagrams",
  description: "Model object-oriented class structures and relationships",
  content: await md`
# Class Diagrams

Class diagrams visualize the structure of object-oriented systems. They show classes, interfaces, enums, and the relationships between them, making them essential for modeling software architecture and design patterns.

## Quick Start

Define a simple class diagram with two classes and an inheritance relationship:

@source typescript ./class-quick-start.class.ts
@diagram ./class-quick-start.class.ts "Quick start class"

The callback receives builders for every structural element. Return an array combining elements and relationships.

## Key Concepts

### Classes

Use \`class_()\` to define a class. The callback receives a builder with chainable methods:

\`\`\`typescript
class_("User", (c) => {
  c.field("id", "string");
  c.field("email", "string", { visibility: "private" });
  c.field("createdAt", "Date", { static: true, readonly: true });
  c.method("getEmail", { returnType: "string", visibility: "public" });
  c.method("setEmail", { parameters: [{ name: "email", type: "string" }], visibility: "public" });
});
\`\`\`

### Visibility Modifiers

Fields and methods support three visibility levels:

- \`"public"\` — accessible from anywhere
- \`"private"\` — accessible only within the class
- \`"protected"\` — accessible within the class and subclasses

\`\`\`typescript
class_("Account", (c) => {
  c.field("password", "string", { visibility: "private" });
  c.field("tenantId", "string", { visibility: "protected" });
  c.field("createdAt", "Date", { visibility: "public", readonly: true });
});
\`\`\`

### Interfaces

Define interfaces with \`interface_()\`. They support method declarations with optional parameters:

\`\`\`typescript
interface_("Serializable", (i) => {
  i.method("toJSON", { returnType: "string" });
});
\`\`\`

### Enums

Define enumerations with \`enum_()\`. Use the \`value()\` method to add enum values:

\`\`\`typescript
enum_("OrderStatus", (e) => {
  e.value("Pending");
  e.value("Processing");
  e.value("Shipped");
  e.value("Delivered");
});
\`\`\`

### Relationships

Draw connections between types using the class builder methods:

\`\`\`typescript
classDiagram("Relationships", ({ class_, interface_ }) => [
  class_("Vehicle"),
  class_("Car", (c) => c.implements("Drivable")),
  interface_("Drivable"),
  class_("Driver", (c) => c.uses("Vehicle")),
]);
\`\`\`

## Advanced Usage

### Generics

Model generic types by including type parameters in the class name:

\`\`\`typescript
class_("List<T>", (c) => {
  c.field("items", "T[]");
  c.method("add", { parameters: [{ name: "item", type: "T" }] });
});

class_("Cache<K, V>", (c) => {
  c.field("store", "Map<K, V>");
  c.method("get", { parameters: [{ name: "key", type: "K" }], returnType: "V | undefined" });
});
\`\`\`

### Composition Patterns

Model composition relationships where one class owns instances of another:

\`\`\`typescript
classDiagram("Composition", ({ class_ }) => [
  class_("Order", (c) => {
    c.field("id", "string");
    c.field("items", "OrderItem[]");
    c.field("customer", "Customer");
  }),
  class_("OrderItem", (o) => {
    o.field("product", "Product");
    o.field("quantity", "number");
  }),
  class_("Customer"),
  class_("Product"),
]);
\`\`\`

### Circular Dependency Detection

Use the validation package to detect circular inheritance chains:

\`\`\`typescript
import { validate, noCircularInheritanceRule, recommended } from "@drawspec/validation";

const result = validate({
  rules: [noCircularInheritanceRule],
  config: recommended,
  diagram: compiledDiagram,
});

if (result.diagnostics.length > 0) {
  console.error("Circular dependencies found:", result.diagnostics);
}
\`\`\`

## Complete Example

Here is a complete class diagram modeling a payment processing system:

@source typescript ./class-complete.class.ts
@diagram ./class-complete.class.ts "Payment system class"
`,
});
