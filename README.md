# DrawSpec

TypeScript-native diagram-as-code platform. Author diagrams as TypeScript, validate in CI, render deterministic SVGs. Every diagram is a TypeScript file compiled through a validation pipeline and rendered to pixel-perfect, deterministic SVG output.

[![CI](https://github.com/drawspec/drawspec/actions/workflows/ci.yml/badge.svg)](https://github.com/drawspec/drawspec/actions) [![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

## Quick Start

Create a project and install the CLI:

```bash
mkdir my-diagram && cd my-diagram
bun init
bun add -d @drawspec/cli @drawspec/uml-sequence
```

Write your first sequence diagram:

```ts
// hello.seq.ts
import { sequence } from "@drawspec/uml-sequence";

sequence("Hello", (s) => {
  s.actor("Alice");
  s.actor("Bob");
  s.message("Alice", "Bob", "Hello!");
});
```

Render to SVG:

```bash
bunx drawspec render hello.seq.ts --out .
```

Start the dev server with live reload:

```bash
bunx drawspec serve .
```

## Packages

| Package | Description |
|---------|-------------|
| [@drawspec/core](packages/core) | Diagram IR, diagnostics, deterministic IDs, compilation pipeline |
| [@drawspec/architecture](packages/architecture) | C4 model (person, softwareSystem, container, database), views, relationships |
| [@drawspec/uml-sequence](packages/uml-sequence) | Sequence diagrams: participants, messages, fragments, notes |
| [@drawspec/uml-class](packages/uml-class) | Class diagrams: classes, interfaces, inheritance, composition |
| [@drawspec/uml-state](packages/uml-state) | State diagrams: states, transitions, composite states |
| [@drawspec/uml-component](packages/uml-component) | Component diagrams: components, interfaces, dependencies |
| [@drawspec/uml-deployment](packages/uml-deployment) | Deployment diagrams: nodes, artifacts, communication |
| [@drawspec/uml-activity](packages/uml-activity) | Activity diagrams: actions, decisions, partitions |
| [@drawspec/validation](packages/validation) | Rule engine with architecture + diagram validation rules |
| [@drawspec/layout](packages/layout) | Layout engine interfaces and sequence layout |
| [@drawspec/layout-dagre](packages/layout-dagre) | Dagre-based graph layout (dagrejs) |
| [@drawspec/layout-elk](packages/layout-elk) | ELK-based graph layout (Eclipse Layout Kernel) |
| [@drawspec/layout-wasm](packages/layout-wasm) | WASM layout adapter with TypeScript fallback |
| [@drawspec/renderer-svg](packages/renderer-svg) | Deterministic SVG rendering |
| [@drawspec/cache](packages/cache) | Persistent cache (filesystem + SQLite backends) |
| [@drawspec/cli](packages/cli) | CLI binary (check, render, inspect, serve, watch, build:site) |
| [@drawspec/viewer](packages/viewer) | Framework-neutral `<drawspec-diagram>` web component |
| [@drawspec/testkit](packages/testkit) | Test helpers, snapshot utilities, golden test support |
| [@drawspec/lsp](packages/lsp) | Language Server Protocol (diagnostics + document symbols) |
| [@drawspec/vite-plugin](packages/vite-plugin) | Vite plugin for diagram hot reload |
| [@drawspec/exporter-mermaid](packages/exporter-mermaid) | Mermaid diagram export |
| [@drawspec/exporter-plantuml](packages/exporter-plantuml) | PlantUML diagram export |
| [@drawspec/exporter-d2](packages/exporter-d2) | D2 diagram export |

## Documentation

Full documentation at [drawspec.dev/docs](https://drawspec.dev/docs)

## License

MIT
