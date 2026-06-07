import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Programmatic Usage",
  description: "Use DrawSpec packages directly in your own build pipeline or tooling",
  content: await md`
# Programmatic Usage

DrawSpec packages can be used directly in your own tooling, build pipelines, or custom workflows. This guide shows how to assemble the compilation pipeline step by step.

## The Compilation Pipeline

Diagrams move through five stages from author to rendered output:

1. **Author**: Write diagram source using builder functions
2. **Compile**: Convert source to an intermediate representation (IR)
3. **Validate**: Check the IR against validation rules
4. **Layout**: Compute positions for all diagram elements
5. **Render**: Produce SVG output

Each stage has a dedicated package that you can use independently.

## Step by Step Example

This example creates a sequence diagram, validates it, lays it out, and renders it to SVG. The \`sequence()\` builder returns DrawSpec's \`SequenceDocument\` IR directly.

### 1. Author the Diagram

Use package-specific builders to create diagram source:

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

const diagram = sequence("Hello world", (seq) => {
  const alice = seq.actor("Alice");
  const bob = seq.participant("Bob");

  alice.to(bob, "Hello!");
  bob.to(alice, "Hi there!");
});
\`\`\`

### 2. Compile to IR

The high-level \`sequence()\` builder already compiles the diagram to IR:

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";

const diagram = sequence("Hello world", (seq) => {
  const alice = seq.actor("Alice");
  const bob = seq.participant("Bob");

  alice.to(bob, "Hello!");
  bob.to(alice, "Hi there!");
});

const ir = diagram;
\`\`\`

The IR is a plain JavaScript object that represents the diagram structure independently of the DSL used to author it. Lower-level compiler functions such as \`compileSequenceDocument()\` accept domain models, not the output of \`sequence()\`.

### 3. Validate

Use \`@drawspec/validation\` to check the IR:

\`\`\`typescript
import { validate } from "@drawspec/validation";
import { recommended, recommendedRules } from "@drawspec/validation/presets";

const result = validate({
  diagram: ir,
  rules: recommendedRules,
  config: recommended,
});

if (result.diagnostics.length > 0) {
  for (const diagnostic of result.diagnostics) {
    console.error(\`\${diagnostic.severity}: \${diagnostic.message}\`);
  }
}
\`\`\`

### 4. Layout

Compute element positions using layout functions:

\`\`\`typescript
import { sequenceLayout } from "@drawspec/layout";

const positionedDiagram = await sequenceLayout().layout(ir);
\`\`\`

For non-sequence diagrams, use \`simpleGraphLayout\`:

\`\`\`typescript
import { simpleGraphLayout } from "@drawspec/layout";

const positionedDiagram = await simpleGraphLayout().layout(ir);
\`\`\`

### 5. Render

Produce SVG output:

\`\`\`typescript
import { renderSvg } from "@drawspec/renderer-svg";

const svg = await renderSvg(ir, {
  positionedDiagram,
  width: 800,
  height: 600,
});
\`\`\`

## Policy Packs

Use policy packs to switch between built-in validation configurations:

\`\`\`typescript
import { loadPolicyPack, validate } from "@drawspec/validation";
import { recommendedRules } from "@drawspec/validation/presets";

const strict = loadPolicyPack("strict");
const relaxed = loadPolicyPack("relaxed");

const result = validate({
  diagram: ir,
  rules: recommendedRules,
  config: { rules: strict.rules },
});
\`\`\`

## Custom Validation Rules

You can define your own validation rules by implementing the \`Rule\` interface:

\`\`\`typescript
import type { Rule } from "@drawspec/validation";

const noEmptyMessages: Rule = {
  name: "no-empty-messages",
  meta: {
    description: "Messages must have non-empty labels",
    defaultSeverity: "error",
  },
  create(context) {
    return {
      diagramEdge(edge) {
        if (typeof edge.label !== "string" || edge.label.trim() === "") {
          context.report({
            message: \`Message \${edge.id} has an empty label\`,
            target: { kind: "edge", id: edge.id },
          });
        }
      },
    };
  },
};

// Use the rule alongside the recommended preset
import { validate } from "@drawspec/validation";
import { recommended, recommendedRules } from "@drawspec/validation/presets";

const result = validate({
  diagram: ir,
  rules: [...recommendedRules, noEmptyMessages],
  config: {
    rules: {
      ...recommended.rules,
      "no-empty-messages": "error",
    },
  },
});
\`\`\`

## Custom Layout Engine

Implement the \`LayoutEngine\` interface to provide your own layout algorithm:

\`\`\`typescript
import type { DiagramDocument } from "@drawspec/core";
import type { LayoutEngine, PositionedDiagram } from "@drawspec/layout";

const myLayoutEngine: LayoutEngine = {
  name: "my-custom-layout",
  supports(document: DiagramDocument): boolean {
    return document.kind !== "sequence";
  },
  async layout(document): Promise<PositionedDiagram> {
    // Your layout algorithm here
    return {
      document,
      nodes: [],
      edges: [],
      groups: [],
      activations: [],
      width: 800,
      height: 600,
    };
  },
};

// Use with the renderer
import { renderSvg } from "@drawspec/renderer-svg";

const positionedDiagram = await myLayoutEngine.layout(ir);
const svg = await renderSvg(ir, {
  positionedDiagram,
});
\`\`\`

## Package Summary

| Package | Exports | Purpose |
|---------|---------|---------|
| \`@drawspec/uml-sequence\` | \`sequence\`, \`compileSequenceDocument\` | Author and compile sequence diagrams |
| \`@drawspec/validation\` | \`validate\`, \`loadPolicyPack\`, \`Rule\` | Validate diagram IR |
| \`@drawspec/layout\` | \`sequenceLayout\`, \`simpleGraphLayout\`, \`LayoutEngine\` | Compute element positions |
| \`@drawspec/renderer-svg\` | \`renderSvg\` | Render to SVG |
| \`@drawspec/core\` | Core types and utilities | Shared types used across packages |
`,
});
