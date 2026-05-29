# DrawSpec

TypeScript-native diagram-as-code platform. Author diagrams as TypeScript, validate in CI, render deterministic SVGs. Every diagram is a TypeScript file compiled through a validation pipeline and rendered to pixel-perfect, deterministic SVG output.

[![CI](https://github.com/drawspec/drawspec/actions/workflows/ci.yml/badge.svg)](https://github.com/drawspec/drawspec/actions) [![Tests](https://img.shields.io/badge/tests-562%20passing-brightgreen)](https://github.com/drawspec/drawspec) [![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

## Quick Start

Install the CLI globally and create your first diagram:

```bash
bun add -g drawspec
mkdir my-diagram && cd my-diagram
echo "import { diagram } from '@drawspec/core'; diagram('Hello', { autoLayout: true })" > hello.diagram.ts
bunx drawspec render hello.diagram.ts --output hello.svg
```

Start the dev server with hot reload:

```bash
bunx drawspec serve --watch
```

## Packages (24 total)

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
| [@drawspec/docs](packages/docs) | Documentation engine (Doc IR, defineDoc, md tag, HTML renderer) |

## Documentation

Full documentation at [drawspec.dev/docs](https://drawspec.dev/docs)

## License

MIT