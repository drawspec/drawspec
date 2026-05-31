import { defineDoc, md } from "../../../packages/docs/src/index.js";

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

This example creates a sequence diagram, compiles it, validates it, lays it out, and renders it to SVG.

###1. Author the Diagram

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

Each diagram type has its own compiler function:

\`\`\`typescript
import { sequence } from "@drawspec/uml-sequence";
import { compileSequenceDocument } from "@drawspec/uml-sequence";

const diagram = sequence("Hello world", (seq) => {
  const alice = seq.actor("Alice");
  const bob = seq.participant("Bob");

  alice.to(bob, "Hello!");
  bob.to(alice, "Hi there!");
});

const ir = compileSequenceDocument(diagram);
\`\`\`

The IR is a plain JavaScript object that represents the diagram structure independently of the DSL used to author it.

### 3. Validate

Use \`@drawspec/validation\` to check the IR:

\`\`\`typescript
import { validate } from "@drawspec/validation";
import { recommended } from "@drawspec/validation/presets";

const result = validate(ir, recommended);

if (!result.valid) {
  for (const diagnostic of result.diagnostics) {
    console.error(\`\${diagnostic.severity}: \${diagnostic.message}\`);
  }
}
\`\`\`

### 4. Layout

Compute element positions using layout functions:

\`\`\`typescript
import { sequenceLayout } from "@drawspec/layout";

const layout = sequenceLayout(ir);
\`\`\`

For non-sequence diagrams, use \`simpleGraphLayout\`:

\`\`\`typescript
import { simpleGraphLayout } from "@drawspec/layout";

const layout = simpleGraphLayout(ir);
\`\`\`

###5. Render

Produce SVG output:

\`\`\`typescript
import { renderSvg } from "@drawspec/renderer-svg";

const svg = renderSvg(layout, {
  theme: "light",
  width: 800,
  height: 600,
});
\`\`\`

## Custom Validation Rules

You can define your own validation rules by implementing the \`Rule\` interface:

\`\`\`typescript
import type { Rule, Diagnostic } from "@drawspec/validation";

const noEmptyMessages: Rule = {
  name: "no-empty-messages",
  description: "Messages must have non-empty labels",
  check(ir): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const message of ir.messages) {
      if (!message.label || message.label.trim() === "") {
        diagnostics.push({
          severity: "error",
          message: \`Message at index \${message.id} has an empty label\`,
          node: message.id,
        });
      }
    }

    return diagnostics;
  },
};

// Use the rule alongside the recommended preset
import { validate } from "@drawspec/validation";
import { recommended } from "@drawspec/validation/presets";

const result = validate(ir, [...recommended, noEmptyMessages]);
\`\`\`

## Custom Layout Engine

Implement the \`LayoutEngine\` interface to provide your own layout algorithm:

\`\`\`typescript
import type { LayoutEngine, LayoutResult } from "@drawspec/layout";

const myLayoutEngine: LayoutEngine = {
  name: "my-custom-layout",
  layout(ir): LayoutResult {
    // Your layout algorithm here
    return {
      elements: new Map(),
      width: 800,
      height: 600,
    };
  },
};

// Use with the renderer
import { renderSvg } from "@drawspec/renderer-svg";

const svg = renderSvg(myLayoutEngine.layout(ir), {
  theme: "light",
});
\`\`\`

## Package Summary

| Package | Exports | Purpose |
|---------|---------|---------|
| \`@drawspec/uml-sequence\` | \`sequence\`, \`compileSequenceDocument\` | Author and compile sequence diagrams |
| \`@drawspec/validation\` | \`validate\`, \`recommended\`, \`Rule\` | Validate diagram IR |
| \`@drawspec/layout\` | \`sequenceLayout\`, \`simpleGraphLayout\`, \`LayoutEngine\` | Compute element positions |
| \`@drawspec/renderer-svg\` | \`renderSvg\` | Render to SVG |
| \`@drawspec/core\` | Core types and utilities | Shared types used across packages |
`,
});
