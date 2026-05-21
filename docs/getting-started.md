# Getting Started

## Installation

```bash
bun add @drawspec/core @drawspec/cli @drawspec/uml-sequence @drawspec/architecture
```

## Create a Diagram

DrawSpec diagrams are TypeScript files that export either a `DiagramDocument` (for UML diagrams like sequence, class, component diagrams) or a `Workspace` (for architecture/C4 diagrams). UML diagrams export a single `DiagramDocument`; architecture diagrams export a `Workspace` that compiles to multiple `DiagramDocument` views. Each diagram type has its own builder API.

### Sequence Diagram

```typescript
// login.sequence.ts
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Login Flow", (s) => {
  const user = s.actor("User");
  const server = s.participant("Server");

  user.to(server, "POST /login");
  server.to(user, "200 OK");
});
```

### C4 Architecture Diagram

```typescript
// shop.arch.ts
import { person, softwareSystem, workspace } from "@drawspec/architecture";

export default workspace("My System", (w) => {
  const user = w.model.add(person("User"));
  const system = w.model.add(softwareSystem("My App"));

  user.uses(system, "Uses");

  w.views.systemContext(system, "context", (v) => {
    v.include(user);
    v.autoLayout("left-right");
  });
});
```

## CLI Commands

The `drawspec` binary (aliases: `ds`, `dspec`) provides these commands:

| Command | Description |
|---------|-------------|
| `drawspec check [files...]` | Validate diagrams against rules |
| `drawspec render [files...]` | Render diagrams to SVG |
| `drawspec inspect [file]` | Print diagram IR as JSON |
| `drawspec watch [files...]` | Watch and re-render on changes |
| `drawspec serve [files...]` | Live preview server with hot reload |

### Common Options

```
--format pretty|json     Output format (check, inspect)
--out <dir>              Output directory (render, default: dist)
--theme light|dark       Render theme
--port <number>          Server port (watch/serve, default: 4173)
--host <string>          Server hostname (serve, default: localhost)
--open                   Open browser on start (serve)
--config <path>          Config file path
```

### File Discovery

The CLI auto-discovers files matching these patterns:

- `**/*.diagram.ts` — Generic diagrams
- `**/*.sequence.ts` — Sequence diagrams
- `**/*.arch.ts` — Architecture/C4 diagrams

## Render Pipeline

```
TypeScript source
    ↓  (import + execute)
DiagramDocument (IR)
    ↓  (validate)
Diagnostics
    ↓  (layout engine)
PositionedDiagram
    ↓  (SVG renderer)
SVG output
```

1. **Build** — TypeScript is imported and executed. The exported value (or factory return) is compiled into a `DiagramDocument`.
2. **Validate** — The document is checked against configurable rules.
3. **Layout** — A layout engine computes positions for all nodes and edges.
4. **Render** — The positioned diagram is rendered to SVG.
