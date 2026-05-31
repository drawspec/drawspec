import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Exporters",
  description: "Export DrawSpec diagrams to Mermaid, PlantUML, and D2 formats",
  content: await md`
# Exporters

DrawSpec provides exporters that convert diagrams to popular diagramming languages. This lets you use DrawSpec diagrams in tools that understand Mermaid, PlantUML, or D2.

## Mermaid

The Mermaid exporter produces Mermaid diagram definitions from DrawSpec documents.

### Programmatic Usage

\`\`\`typescript
import { classDiagram } from "@drawspec/uml-class";
import { simpleGraphLayout } from "@drawspec/layout";
import { compileLayout } from "@drawspec/layout";
import { exportToMermaid } from "@drawspec/exporter-mermaid";

const doc = classDiagram("Example", ({ class_ }) => [
  class_("Animal"),
  class_("Dog"),
]);

const layoutEngine = simpleGraphLayout();
const positioned = await layoutEngine.layout(doc);
const compiled = compileLayout(doc, positioned);

const mermaid = exportToMermaid(compiled);
console.log(mermaid);
\`\`\`

### Supported Diagram Kinds

- Sequence diagrams
- Class diagrams
- State diagrams
- Flowcharts
- ER diagrams
- General graphs

### Known Limitations

The Mermaid exporter does not currently support:
- Annotations
- Custom styles
- Metadata
- Group descriptions

## PlantUML

The PlantUML exporter generates PlantUML markup from DrawSpec documents.

### Programmatic Usage

\`\`\`typescript
import { stateDiagram } from "@drawspec/uml-state";
import { exportToPlantUML } from "@drawspec/exporter-plantuml";

const doc = stateDiagram("Traffic light", ({ state, initial, final }) => [
  initial(),
  state("Red", (s) => s.to("Green")),
  state("Green", (s) => s.to("Yellow")),
  state("Yellow", (s) => s.to("Red")),
  final(),
]);

const plantuml = exportToPlantUML(doc);
console.log(plantuml);
\`\`\`

### Supported Diagram Kinds

- Sequence diagrams (with fragments)
- Class diagrams (with stereotypes)
- State diagrams (with composite states)
- Activity diagrams
- Component diagrams
- Deployment diagrams
- Architecture (C4 model)

### C4 Model Export

PlantUML export includes C4-PlantUML stdlib for architecture diagrams:

\`\`\`typescript
import { exportToPlantUML } from "@drawspec/exporter-plantuml";

const plantuml = exportToPlantUML(architectureDoc);
// Output includes: !include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
\`\`\`

## D2

The D2 exporter generates D2 diagram definitions from DrawSpec documents.

### Programmatic Usage

\`\`\`typescript
import { componentDiagram } from "@drawspec/uml-component";
import { exportToD2 } from "@drawspec/exporter-d2";

const doc = componentDiagram("Services", ({ component, dependency }) => {
  component("API");
  component("Database");
  dependency("API", "Database");
});

const d2 = exportToD2(doc);
console.log(d2);
\`\`\`

### Direction

D2 export respects the diagram layout direction:

\`\`\`typescript
const doc = classDiagram("Example", ({ class_ }) => [
  class_("A"),
  class_("B"),
], { layout: { direction: "LR" } });

const d2 = exportToD2(doc);
// Output starts with: direction: right
\`\`\`

### Shape Mapping

D2 export maps node kinds to D2 shapes:

- \`"person"\` → person shape
- \`"database"\` → cylinder shape
- \`"class"\` → class shape
- \`"sql_table"\` → SQL table shape

## CLI Usage

All exporters are accessible through the DrawSpec CLI.

### Mermaid Export

\`\`\`bash
drawspec export diagram.ts --format mermaid
\`\`\`

### PlantUML Export

\`\`\`bash
drawspec export diagram.ts --format plantuml
\`\`\`

### D2 Export

\`\`\`bash
drawspec export diagram.ts --format d2
\`\`\`

### Output Options

Save to a file or output to stdout:

\`\`\`bash
# Save to file
drawspec export diagram.ts --format mermaid --output diagram.mmd

# Output to stdout
drawspec export diagram.ts --format d2
\`\`\`

### Batch Export

Export multiple diagrams to different formats:

\`\`\`bash
drawspec export ./diagrams/**/*.ts --format mermaid --output ./output/
\`\`\`

## Complete Example

Export a class diagram to all three formats:

\`\`\`typescript
import { classDiagram } from "@drawspec/uml-class";
import { simpleGraphLayout } from "@drawspec/layout";
import { exportToMermaid } from "@drawspec/exporter-mermaid";
import { exportToPlantUML } from "@drawspec/exporter-plantuml";
import { exportToD2 } from "@drawspec/exporter-d2";

const doc = classDiagram("Animal hierarchy", ({ class_, extends_ }) => [
  class_("Animal", (c) => {
    c.field("name", "string");
    c.method("speak", { returnType: "string" });
  }),
  class_("Dog", (c) => {
    c.extends("Animal");
    c.method("bark", { returnType: "string" });
  }),
]);

const engine = simpleGraphLayout();
const positioned = await engine.layout(doc);
const compiled = compileLayout(doc, positioned);

const mermaid = exportToMermaid(compiled);
const plantuml = exportToPlantUML(compiled);
const d2 = exportToD2(compiled);

console.log("Mermaid:");
console.log(mermaid);
console.log("\nPlantUML:");
console.log(plantuml);
console.log("\nD2:");
console.log(d2);
\`\`\`
`,
});