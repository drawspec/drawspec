import { defineDoc, md } from "@drawspec/docs";

export const forceLayoutDoc = defineDoc({
  title: "Force-directed Layout",
  description: "Deterministic force-directed graph layout for DrawSpec diagrams",
  content: await md`
# Force-directed Layout

\`@drawspec/layout-force\` provides a deterministic force-directed layout engine for non-sequence DrawSpec diagrams.

The engine runs a fixed-step simulation with three forces:

- node repulsion to separate every pair of nodes
- edge attraction to pull connected nodes toward a preferred distance
- centering force to keep the graph compact

No random seed is required: initial node positions come from sorted node ids on a circle, and every tick uses deterministic arithmetic.

## Usage

\`\`\`typescript
import { forceLayout } from "@drawspec/layout-force";

const positioned = await forceLayout().layout(document, {
  force: {
    iterations: 300,
    repulsion: 6000,
    attraction: 0.08,
    distance: 160,
    centerStrength: 0.02,
  },
});
\`\`\`

## Options

| Option | Description |
| --- | --- |
| \`force.iterations\` | Fixed simulation ticks. More iterations improve convergence at higher cost. |
| \`force.repulsion\` | Charge strength between every pair of nodes. |
| \`force.attraction\` | Spring strength along graph edges. |
| \`force.distance\` | Preferred connected-node center distance. Defaults to rank spacing. |
| \`force.centerStrength\` | Pull toward the initial canvas center. |

The engine also honors shared DrawSpec layout options such as \`padding\`, \`nodeSize\`, and sizing configuration.
`,
});
