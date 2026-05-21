# Basic Sequence Diagram

A minimal sequence diagram showing a user login flow with an error-handling branch.

## Run

```bash
# From repo root
bunx drawspec render examples/basic-sequence/diagram.ts --out ./output

# Or open live preview
bunx drawspec serve examples/basic-sequence/diagram.ts --open
```

## What it demonstrates

- Creating actors and participants with `s.actor()` / `s.participant()`
- Sending messages with `.to()`
- Attaching notes with `.note()`
- Conditional branches with `s.alt()`
