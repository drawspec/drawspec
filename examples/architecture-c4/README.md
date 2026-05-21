# Architecture C4 Diagram

A C4 architecture diagram for an online shop with system context and container views.

## Run

```bash
# From repo root
bunx drawspec render examples/architecture-c4/diagram.ts --out ./output

# Or open live preview
bunx drawspec serve examples/architecture-c4/diagram.ts --open
```

## What it demonstrates

- Creating elements: `person()`, `softwareSystem()`, `container()`, `database()`
- Nesting containers inside a software system with `.add()`
- Defining relationships with `.uses()`
- Adding views with `w.views.systemContext()` and `w.views.container()`
- Controlling layout direction with `.autoLayout()`
