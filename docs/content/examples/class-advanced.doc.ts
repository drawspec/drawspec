import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Advanced Class Diagram",
  description: "Interfaces, enums, composition, and multiple inheritance hierarchies",
  content: await md`
# Advanced Class Diagram

This example shows a vehicle domain model with interfaces, enums, composition, and multiple inheritance hierarchies. It demonstrates how class diagrams can model real-world domains with complex relationships.

## Diagram

@diagram ./class-advanced.class.ts "Vehicle system"

## Code

\`\`\`typescript
import { classDiagram } from "@drawspec/uml-class";

export default classDiagram("Vehicle system", ({ class_, interface_, enum_, implements_, uses }) => [
  interface_("IDriveable", (i) => {
    i.method("start", { visibility: "public" });
    i.method("stop", { visibility: "public" });
    i.method("moveTo", { visibility: "public", parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }] });
  }),

  interface_("IRepository", (i) => {
    i.method("save", { visibility: "public" });
    i.method("delete", { visibility: "public", parameters: [{ name: "id", type: "string" }] });
    i.method("findById", { visibility: "public", returnType: "unknown", parameters: [{ name: "id", type: "string" }] });
  }),

  enum_("VehicleStatus", (e) => {
    e.value("Idle");
    e.value("Moving");
    e.value("Maintenance");
    e.value("Decommissioned");
  }),

  class_("Engine", (c) => {
    c.field("horsepower", "number");
    c.field("fuelType", "string");
    c.method("ignite", { visibility: "private" });
    c.method("shutdown", { visibility: "private" });
  }),

  class_("Vehicle", (c) => {
    c.field("id", "string");
    c.field("make", "string");
    c.field("model", "string");
    c.field("engine", "Engine");
    c.method("start", { visibility: "public" });
    c.method("stop", { visibility: "public" });
    c.method("moveTo", { visibility: "public", parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }] });
    c.implements("IDriveable");
  }),

  class_("Car", (c) => {
    c.field("numDoors", "number");
    c.field("isElectric", "boolean");
    c.extends("Vehicle");
    c.method("openTrunk", { visibility: "public" });
  }),

  class_("Truck", (c) => {
    c.field("loadCapacity", "number");
    c.field("bedLength", "number");
    c.extends("Vehicle");
    c.method("attachTrailer", { visibility: "public" });
  }),

  class_("VehicleRepository", (c) => {
    c.method("save", { visibility: "public" });
    c.method("delete", { visibility: "public", parameters: [{ name: "id", type: "string" }] });
    c.method("findById", { visibility: "public", returnType: "Vehicle", parameters: [{ name: "id", type: "string" }] });
    c.implements("IRepository");
    c.uses("Vehicle");
  }),

  uses("Vehicle", "Engine"),
]);
\`\`\`

## How It Works

The \`IDriveable\` interface defines the contract for any vehicle that can be driven. Both \`Car\` and \`Truck\` extend the \`Vehicle\` base class, inheriting its engine composition and drive interface implementation.

The \`VehicleRepository\` class implements \`IRepository\` for data persistence and uses the \`Vehicle\` class, indicating that repositories work with vehicle entities without being in an inheritance relationship.

The \`uses\` relationships show composition and dependency patterns. The engine is composed into \`Vehicle\` rather than inherited, meaning vehicles are composed of engines. The repository uses vehicles for storage operations.

## Run It

\`\`\`bash
bunx drawspec render class-advanced.class.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});
