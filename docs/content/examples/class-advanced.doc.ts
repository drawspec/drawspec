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

@source typescript ./class-advanced.class.ts

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
