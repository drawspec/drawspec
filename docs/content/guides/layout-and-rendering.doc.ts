import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Layout and Rendering",
  description: "Control diagram layout and SVG rendering output",
  content: await md`
# Layout and Rendering

DrawSpec separates layout computation from rendering. This lets you position nodes precisely, customize the output format, and theme the visual appearance independently of the diagram structure.

## Layout Engines

DrawSpec provides two layout engines optimized for different diagram types.

### Simple Graph Layout

The \`simpleGraphLayout()\` engine positions nodes in a directed acyclic graph. It computes depths based on edge relationships and arranges nodes in ranked rows:

\`\`\`typescript
import { simpleGraphLayout } from "@drawspec/layout";

const engine = simpleGraphLayout();
const positioned = await engine.layout(document, {
  direction: "TB",
  spacing: { rank: 120, node: 80 },
  padding: 40,
  nodeSize: { width: 120, height: 56 },
});
\`\`\`

### Sequence Layout

The \`sequenceLayout()\` engine arranges sequence diagram elements with lifelines and activation bars:

\`\`\`typescript
import { sequenceLayout } from "@drawspec/layout";

const engine = sequenceLayout();
const positioned = await engine.layout(document, {
  direction: "LR",
  spacing: { lifeline: 160, message: 56 },
});
\`\`\`

## Layout Options

### Direction

Control the flow direction of the graph:

- \`"TB"\` — top to bottom (default)
- \`"BT"\` — bottom to top
- \`"LR"\` — left to right
- \`"RL"\` — right to left

\`\`\`typescript
const positioned = await engine.layout(document, { direction: "LR" });
\`\`\`

### Spacing

Fine-tune the spacing between ranks and nodes:

\`\`\`typescript
const positioned = await engine.layout(document, {
  spacing: {
    rank: 120,    // vertical gap between rank rows
    node: 80,     // horizontal gap between nodes in same rank
    lifeline: 160, // horizontal gap between lifelines (sequence only)
    message: 56,  // vertical gap between messages (sequence only)
  },
});
\`\`\`

### Padding

Set the canvas padding around the diagram:

\`\`\`typescript
const positioned = await engine.layout(document, { padding: 40 });
\`\`\`

### Node Size

Override the default node dimensions:

\`\`\`typescript
const positioned = await engine.layout(document, {
  nodeSize: { width: 140, height: 64 },
});
\`\`\`

## SVG Rendering

Render positioned diagrams to SVG using the SVG renderer:

\`\`\`typescript
import { renderSvg } from "@drawspec/renderer-svg";

const svg = await renderSvg(document, {
  positionedDiagram: positioned,
  theme: { background: "#ffffff", edgeStroke: "#333333" },
  accessibility: {
    title: "Order processing flow",
    description: "Shows the steps to process a customer order",
  },
});
\`\`\`

### Render Options

- \`width\` and \`height\` — set the SVG canvas dimensions
- \`theme\` — customize colors and fonts
- \`accessibility.title\` and \`accessibility.description\` — add ARIA metadata

### Synchronous Rendering

Use \`renderSvgSync()\` for environments where async is not available:

\`\`\`typescript
const svg = renderSvgSync(document, {
  positionedDiagram: positioned,
  width: 800,
  height: 600,
});
\`\`\`

## Theming

### Default Theme

The renderer applies a default theme that covers background, strokes, fonts, and node shapes.

### Custom Theme

Override specific theme values:

\`\`\`typescript
const svg = await renderSvg(document, {
  positionedDiagram: positioned,
  theme: {
    background: "#f8fafc",
    nodeFill: "#e2e8f0",
    nodeStroke: "#64748b",
    edgeStroke: "#94a3b8",
    text: "#1e293b",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 14,
  },
});
\`\`\`

### Style Resolution

The renderer uses \`resolveStyle()\` to apply styles based on element kind, metadata, and theme defaults. Element-specific styles in diagram metadata take precedence.

## Complete Example

Layout and render a class diagram to SVG:

\`\`\`typescript
import { classDiagram } from "@drawspec/uml-class";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";

const doc = classDiagram("Inheritance example", ({ class_, extends_ }) => [
  class_("Animal", (c) => { c.method("speak", { returnType: "string" }); }),
  class_("Dog", (c) => { c.extends("Animal"); c.method("bark", { returnType: "string" }); }),
]);

const layoutEngine = simpleGraphLayout();
const positioned = await layoutEngine.layout(doc, { direction: "TB", padding: 40 });

const svg = await renderSvg(doc, {
  positionedDiagram: positioned,
  theme: { background: "#ffffff" },
  accessibility: { title: doc.title },
});

console.log(svg);
\`\`\`
`,
});