# Builder API

DrawSpec provides TypeScript builder APIs for each diagram type. UML builders produce a `DiagramDocument`; architecture builders produce a `Workspace` containing multiple views. Both are consumed by layout engines and renderers.

## Core Concepts

### DiagramDocument

Every diagram compiles to a `DiagramDocument`:

```typescript
interface DiagramDocument {
  schemaVersion: string;
  id: string;
  title?: string;
  kind: DiagramKind;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  annotations: DiagramAnnotation[];
  layout?: LayoutSpec;
  styles?: StyleSheet;
  metadata?: Record<string, unknown>;
  diagnostics?: Diagnostic[];
}
```

### DiagramKind

Supported diagram kinds: `architecture`, `sequence`, `class`, `component`, `deployment`, `state`, `activity`, `use-case`, `object`, `timing`, `er`, `graph`.

### Deterministic IDs

All IDs are deterministic — the same input always produces the same output. Never use `Math.random()` or `Date.now()` in diagram code.

## Sequence Diagrams (`@drawspec/uml-sequence`)

```typescript
import { sequence } from "@drawspec/uml-sequence";

const doc = sequence("Title", (s) => {
  const alice = s.actor("Alice");
  const bob = s.participant("Bob");

  alice.to(bob, "Hello!").note("A greeting");
  bob.to(alice, "Hi!");

  s.alt("No response", (s2) => {
    bob.to(alice, "Timeout");
  }).else("Response received", (s2) => {
    bob.to(alice, "Here is the data");
  });
});
```

### Builder Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `s.actor(name)` | `SequenceActor` | Define an actor (stick figure) |
| `s.participant(name)` | `SequenceParticipant` | Define a participant (box) |
| `s.alt(condition, fn)` | `SequenceFragmentBuilder` | Start alt fragment |
| `.to(other, label)` | `SequenceMessage` | Send a message |
| `.note(text)` | `this` | Attach a note to element/message |
| `.else(condition, fn)` | `SequenceFragmentBuilder` | Add alt branch |

## Architecture / C4 (`@drawspec/architecture`)

```typescript
import { container, database, person, softwareSystem, workspace } from "@drawspec/architecture";

const ws = workspace("My Workspace", (w) => {
  const user = w.model.add(person("User", { description: "End user" }));
  const system = w.model.add(softwareSystem("My System"));

  const api = system.add(container("API", { technology: "Bun" }));
  const db = system.add(database("DB", { technology: "PostgreSQL" }));

  user.uses(system, "Interacts with");
  api.uses(db, "Reads/writes", { technology: "SQL" });

  w.views.systemContext(system, "context", (v) => {
    v.include(user);
    v.autoLayout("left-right");
  });
});

// Architecture builders return Workspace, not DiagramDocument.
// The CLI accepts Workspace directly. For programmatic use, compile to documents:
const docs = ws.compile(); // returns DiagramDocument[]
```
```

### Element Builders

| Function | C4 Kind | Description |
|----------|---------|-------------|
| `person(name, opts?)` | `person` | External person |
| `softwareSystem(name, opts?)` | `softwareSystem` | Software system |
| `container(name, opts?)` | `container` | Container within a system |
| `database(name, opts?)` | `database` | Data store |

### Element Options

```typescript
interface ArchitectureElementOptions {
  id?: string;
  description?: string;
  technology?: string;
  owner?: string;
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}
```

### Relationship Options

```typescript
interface ArchitectureRelationshipOptions {
  id?: string;
  description?: string;
  technology?: string;
  protocol?: string;
  direction?: "forward" | "backward" | "bidirectional" | "none";
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
  criticality?: string;
  owner?: string;
}
```

> Note: This is a simplified subset. The full interface includes additional optional fields.

### Views

| Method | Description |
|--------|-------------|
| `w.views.systemContext(subject, key?, configure?)` | System context view |
| `w.views.container(subject, key?, configure?)` | Container view |

View configuration:

| Method | Description |
|--------|-------------|
| `v.include(...elements)` | Include elements in view |
| `v.autoLayout(direction)` | Set auto-layout direction |

Layout directions: `"left-right"`, `"right-left"`, `"top-down"`, `"bottom-up"`.

## Generic Builder (`@drawspec/core`)

For diagram kinds without a dedicated package, use the generic builder:

```typescript
import { createBuilderFactory, serializeDocument } from "@drawspec/core";
import type { DiagramDocument } from "@drawspec/core";

const factory = createBuilderFactory();

const node1 = factory.element("class", { parentId: undefined }).id("User").label("User").build();
const node2 = factory.element("class").label("Order").build();
const edge = factory.relationship().from(node1.id).to(node2.id).label("places").build();

const doc: DiagramDocument = {
  schemaVersion: "1.0",
  id: "my-diagram",
  kind: "class",
  nodes: [node1, node2],
  edges: [edge],
  groups: [],
  annotations: [],
};
```

### ElementBuilder

| Method | Description |
|--------|-------------|
| `.id(value)` | Set explicit ID |
| `.label(text)` | Set display label |
| `.description(text)` | Set description |
| `.tag(...tags)` | Add tags |
| `.metadata(meta)` | Set metadata |
| `.style(ref)` | Set style reference |
| `.source(ref)` | Set source reference |
| `.build()` | Build the node |

### RelationshipBuilder

| Method | Description |
|--------|-------------|
| `.id(value)` | Set explicit ID |
| `.from(sourceId)` | Set source |
| `.to(targetId)` | Set target |
| `.label(text)` | Set display label |
| `.direction(dir)` | Set direction |
| `.tag(...tags)` | Add tags |
| `.build()` | Build the edge |

## Serialization

```typescript
import { serializeDocument } from "@drawspec/core";

const json = serializeDocument(doc);
```

Produces deterministic, sorted JSON — the same document always serializes to the same string.
