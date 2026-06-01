# DrawSpec Programmatic API

Standalone scripts demonstrating how to use the DrawSpec API directly without a build tool.

## Setup

```bash
bun install
```

## Compile and Render to SVG

Define a sequence diagram, run layout, render to SVG, and write to a file:

```bash
bun run render
```

This runs `src/compile-and-render.ts` which demonstrates the full pipeline:

1. **Define** — `sequence()` builds a `DiagramDocument`
2. **Layout** — `sequenceLayout().layout(document)` computes positions
3. **Render** — `renderSvg(document, { positionedDiagram })` produces SVG
4. **Write** — output is written to `src/output.svg`

## Validate Diagrams

Run the recommended validation rules against diagrams:

```bash
bun run validate
```

This runs `src/validate.ts` which demonstrates:

- Creating a `RuleEngine` with `recommendedRules`
- Calling `engine.validate({ diagram })` to check for issues
- Loading policy packs via `loadPolicyPack("strict")` for severity configuration

## Export to Mermaid

Convert DrawSpec diagrams to Mermaid syntax:

```bash
bun run export:mermaid
```

This runs `src/export-mermaid.ts` which demonstrates:

- `exportToMermaid(document)` converts any `DiagramDocument` to Mermaid syntax
- Supports sequence, class, state, activity, and other diagram types

## API Overview

### Define Diagrams

```ts
import { sequence } from "@drawspec/uml-sequence";

const doc = sequence("Title", (s) => {
  const a = s.actor("Alice");
  const b = s.actor("Bob");
  a.to(b, "Hello!");
});
```

### Layout

```ts
import { sequenceLayout, simpleGraphLayout } from "@drawspec/layout";

// For sequence diagrams:
const positioned = await sequenceLayout().layout(doc);

// For other diagrams (class, architecture, etc.):
const positioned = await simpleGraphLayout().layout(doc, { direction: "LR" });
```

### Render SVG

```ts
import { renderSvg } from "@drawspec/renderer-svg";

const svg = await renderSvg(doc, {
  positionedDiagram: positioned,  // Required — from layout engine
  theme: { background: "#fff" },  // Optional theme overrides
});
```

### Validate

```ts
import { RuleEngine, recommendedRules } from "@drawspec/validation";

const engine = new RuleEngine(recommendedRules);
const result = engine.validate({ diagram: doc });

for (const diagnostic of result.diagnostics) {
  console.log(`[${diagnostic.severity}] ${diagnostic.message}`);
}
```

### Export to Mermaid

```ts
import { exportToMermaid } from "@drawspec/exporter-mermaid";

const mermaidCode = exportToMermaid(doc);
```
