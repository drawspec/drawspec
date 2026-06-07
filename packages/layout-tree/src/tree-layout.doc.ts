import { defineDoc, md } from "@drawspec/docs";

export const treeLayoutDoc = defineDoc({
  title: "Tree Layout",
  description: "Deterministic rooted-forest layout for DrawSpec graph diagrams",
  content: await md`
# Tree Layout

\`@drawspec/layout-tree\` provides a deterministic tree layout engine for non-sequence DrawSpec diagrams.

The engine builds a rooted forest from directed edges, places leaves in sorted order, and centers each parent above its child span. Cycles are broken deterministically by visited-node order, so cyclic graphs still produce stable output.

## Usage

\`\`\`typescript
import { treeLayout } from "@drawspec/layout-tree";

const positioned = await treeLayout().layout(document, {
  tree: {
    direction: "TB",
    nodeSpacing: 80,
    levelSpacing: 120,
  },
});
\`\`\`

## Directions

| Direction | Result |
| --- | --- |
| \`TB\` | Root at top, children below. |
| \`BT\` | Root at bottom, children above. |
| \`LR\` | Root at left, children to the right. |
| \`RL\` | Root at right, children to the left. |

## Options

| Option | Description |
| --- | --- |
| \`tree.direction\` | Tree direction. Defaults to the shared layout direction. |
| \`tree.nodeSpacing\` | Space between sibling subtree centers. |
| \`tree.levelSpacing\` | Space between tree levels. |

The engine also honors shared DrawSpec layout options such as \`padding\`, \`nodeSize\`, and sizing configuration.
`,
});
