# DrawSpec Technical Product Specification

Status: Draft v0.1  
Date: 2026-05-18  
Primary language: TypeScript  
Default runtime/package manager: Bun  
Primary quality toolchain: Biome, TypeScript, Bun test  
Working package scope: `@drawspec/*`

## 1. Executive summary

DrawSpec is a TypeScript-native diagram-as-code and architecture-as-code platform.

Its goal is to cover the practical feature set people use PlantUML for, while adding the semantic architecture modeling strengths of tools like LikeC4 and Structurizr. Instead of defining a new textual DSL or depending on `.puml` files, diagrams are authored as normal TypeScript modules. This lets teams use their existing TypeScript ecosystem: Biome for linting and formatting, TypeScript for type checking and refactoring, Bun for fast execution and testing, and standard IDE tooling for navigation and autocomplete.

DrawSpec is not a PlantUML parser, not a PlantUML-compatible renderer, and not a wrapper around PlantUML. PlantUML is treated as a feature benchmark and possible export target, not as the source format.

The core proposition:

```txt
Typed diagrams, architecture models, validation, rendering, and live previews,
all inside a modern TypeScript toolchain.
```

The product should provide:

- A TypeScript authoring API for UML-style diagrams.
- A TypeScript authoring API for architecture-as-code.
- A shared intermediate representation, called Diagram IR.
- Semantic validation and lint-style rules over the model and diagrams.
- Fast rendering to SVG and interactive preview surfaces.
- A CLI for check, render, watch, inspect, and build-site workflows.
- A Vite plugin and React viewer components.
- A monorepo package architecture so users can adopt only what they need.
- Testability as a first-class feature.

## 2. Problem statement

PlantUML is powerful because it supports a very broad range of diagram types. It is also widely known, text-based, scriptable, and usable in documentation pipelines. But it has several weaknesses:

- Weak linting ecosystem.
- Weak formatting ecosystem.
- Poor batch diagnostics.
- Inconsistent editor support quality.
- Loose syntax that makes robust tooling hard.
- Little semantic understanding of architecture.
- Limited ability to write tests against architecture rules.
- Java-based runtime dependency for rendering.
- Difficult integration with modern TypeScript-first tooling.

LikeC4 and Structurizr solve some architecture modeling problems, but they do not cover the broader practical UML feature set that makes PlantUML attractive. Mermaid and D2 have healthier modern ecosystems in some ways, but neither is a full PlantUML-style UML replacement with strong architecture semantics.

The gap is a TypeScript-native system that combines:

- PlantUML-like diagram breadth.
- LikeC4/Structurizr-like architecture modeling.
- TypeScript-native authoring.
- Strong validation and testability.
- Fast preview and rendering.
- Modular package design.

## 3. Product goals

### 3.1 Primary goals

DrawSpec should:

1. Let users define diagrams in TypeScript, not a new DSL.
2. Let Biome format and lint the source files.
3. Provide strongly typed APIs for common UML and architecture diagrams.
4. Provide architecture-as-code modeling with elements, relationships, tags, metadata, views, and validation.
5. Provide a shared Diagram IR consumed by validation, rendering, preview, and exports.
6. Provide fast SVG rendering for core diagram types.
7. Provide a near real-time preview workflow for authors.
8. Provide CLI commands suitable for local development and CI.
9. Support TDD for diagrams and architecture rules.
10. Be modular enough for incremental adoption.

### 3.2 Secondary goals

DrawSpec should eventually:

1. Export to Mermaid, PlantUML, D2, Graphviz DOT, and JSON.
2. Import from selected formats where practical, but not as a v1 requirement.
3. Support interactive architecture maps.
4. Support static site generation for documentation.
5. Support large workspaces with incremental builds and caching.
6. Provide VS Code and WebStorm-friendly workflows through LSP or editor plugins.
7. Provide migration helpers from existing diagram ecosystems.

### 3.3 Non-goals

DrawSpec should not:

1. Accept `.puml` as a primary source format.
2. Fully parse PlantUML syntax.
3. Guarantee visual equivalence with PlantUML.
4. Depend on Java for core functionality.
5. Create a new custom authoring DSL for v1.
6. Require a hosted SaaS to function.
7. Replace general drawing tools like Draw.io, Figma, or Excalidraw.
8. Implement every PlantUML feature in v1.
9. Treat layout as a fixed implementation detail.
10. Prioritize pretty output over reliable modeling and validation.

## 4. Design principles

### 4.1 TypeScript first

All first-party source code should be TypeScript. The primary authoring interface should be TypeScript modules. This gives users:

- Biome formatting.
- Biome linting.
- TypeScript type checking.
- Refactor support.
- IDE autocomplete.
- Import/export composition.
- Testability with Bun test or Vitest.
- Familiar package management.

### 4.2 Model first where it matters

Architecture diagrams should be generated from a semantic model, not only from manually drawn boxes and arrows.

A model-first approach enables:

- Multiple views from one source of truth.
- Consistency checks.
- Relationship queries.
- Architecture policy tests.
- Drift detection later.
- Safer refactoring.

### 4.3 Diagram first where appropriate

Not every diagram should require a global architecture model. Sequence diagrams, state diagrams, flowcharts, and exploratory sketches should be authorable directly.

DrawSpec must support both:

- Model-derived diagrams.
- Explicit standalone diagrams.

### 4.4 Shared IR

Every authoring API should compile into a shared Diagram IR. Renderers, exporters, validators, previews, and tests should work on that IR.

This avoids duplicating logic across diagram types and surfaces.

### 4.5 Incremental by default

The system should be designed for near real-time feedback.

That means:

- Incremental compilation.
- Content hashing.
- Cached layouts.
- Debounced expensive rendering.
- Dependency-aware invalidation.
- Fast diagnostic updates.

### 4.6 Conservative rendering and layout

Layout is hard. DrawSpec should make layout pluggable and avoid assuming that one algorithm can satisfy all diagram types.

The initial renderer should be reliable, simple, and fast rather than maximally clever.

### 4.7 Testability is product value

Users should be able to test diagrams and architecture models like code.

Example use cases:

- Ensure every container has a technology.
- Ensure no frontend component talks directly to a database.
- Ensure every external system has an owner.
- Ensure sequence diagrams only reference known architecture elements.
- Ensure no diagram exceeds a complexity budget.

## 5. Scope definition

"Cover PlantUML's feature set" should be interpreted as staged support for diagram categories, not syntax compatibility.

### 5.1 Initial target diagram categories

The first useful product should support:

- Architecture model and architecture views.
- Sequence diagrams.
- Class diagrams.
- Component diagrams.
- Deployment diagrams.
- State diagrams.
- Activity diagrams, at least a limited v1 subset.
- Use case diagrams, if cheap after actor/system modeling exists.

### 5.2 Later diagram categories

Later phases can add:

- Object diagrams.
- Timing diagrams.
- Entity relationship diagrams.
- Network diagrams.
- Gantt diagrams.
- Mind maps.
- WBS diagrams.
- JSON/YAML visualization.
- Regex diagrams.
- Extended C4-style views.
- Interactive dependency graphs.

### 5.3 Explicitly deferred

These should not block v1:

- Perfect automatic layout for all graph types.
- Full visual parity with PlantUML.
- Importing existing `.puml` files.
- GUI diagram editing.
- Hosted collaboration.
- AI diagram generation.
- Whiteboard-style freeform drawing.

## 6. Authoring model

DrawSpec uses TypeScript modules as diagram source files.

Suggested file extensions:

```txt
*.diagram.ts
*.arch.ts
*.view.ts
*.sequence.ts
*.class.ts
*.state.ts
```

The extensions are conventional, not required. They allow tooling and glob defaults to be ergonomic.

### 6.1 Architecture authoring example

```ts
import {
  container,
  database,
  person,
  softwareSystem,
  workspace,
} from "@drawspec/architecture";

export default workspace("Payments")(({ model, views }) => {
  const customer = model.add(person("Customer"));

  const payments = model.add(
    softwareSystem("Payment Platform", {
      description: "Handles payment authorization and ledger updates.",
      owner: "Payments Team",
    }),
  );

  const web = payments.add(
    container("Web App", {
      technology: "React",
      tags: ["frontend"],
    }),
  );

  const api = payments.add(
    container("API", {
      technology: "TypeScript / AWS Lambda",
      tags: ["backend"],
    }),
  );

  const ledger = payments.add(
    database("Ledger DB", {
      technology: "DynamoDB",
      tags: ["database"],
    }),
  );

  customer.uses(web, "Creates payment");
  web.uses(api, "POST /payments");
  api.uses(ledger, "Writes ledger entries");

  views.systemContext(payments, "payments-context", (view) => {
    view.include(customer, payments);
    view.autoLayout("left-right");
  });

  views.container(payments, "payments-containers", (view) => {
    view.include("*");
    view.autoLayout("left-right");
  });
});
```

### 6.2 Sequence diagram example

```ts
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Payment authorization")(({ actor, participant }) => {
  const user = actor("User");
  const web = participant("Web App");
  const api = participant("API");
  const bank = participant("Bank");

  user.to(web, "Submit payment");
  web.to(api, "POST /payments");
  api.to(bank, "Authorize");
  bank.to(api, "Approved");
  api.to(web, "Payment accepted");
  web.to(user, "Show confirmation");
});
```

### 6.3 Sequence diagram with control flow

```ts
import { sequence } from "@drawspec/uml-sequence";

export default sequence("Payment authorization")(({ actor, participant, alt }) => {
  const user = actor("User");
  const api = participant("API");
  const bank = participant("Bank");

  user.to(api, "Create payment");
  api.to(bank, "Authorize");

  alt("Approved", () => {
    bank.to(api, "Authorization approved");
    api.to(user, "Payment accepted");
  }).else("Declined", () => {
    bank.to(api, "Authorization declined");
    api.to(user, "Payment rejected");
  });
});
```

### 6.4 Class diagram example

```ts
import { classDiagram } from "@drawspec/uml-class";

export default classDiagram("Domain model")(({ class_, interface_, enum_ }) => {
  const payment = class_("Payment", {
    fields: [
      ["id", "PaymentId"],
      ["amount", "Money"],
      ["status", "PaymentStatus"],
    ],
    methods: [
      ["authorize", "AuthorizationResult"],
      ["capture", "CaptureResult"],
    ],
  });

  const aggregate = interface_("AggregateRoot", {
    methods: [["recordEvent", "void"]],
  });

  const status = enum_("PaymentStatus", ["Created", "Authorized", "Captured", "Failed"]);

  payment.implements(aggregate);
  payment.uses(status);
});
```

### 6.5 State diagram example

```ts
import { stateDiagram } from "@drawspec/uml-state";

export default stateDiagram("Payment lifecycle")(({ initial, state, final }) => {
  const created = state("Created");
  const authorized = state("Authorized");
  const captured = state("Captured");
  const failed = final("Failed");

  initial().to(created);
  created.to(authorized, "authorize");
  created.to(failed, "decline");
  authorized.to(captured, "capture");
});
```

### 6.6 Activity diagram example

```ts
import { activity } from "@drawspec/uml-activity";

export default activity("Payment flow")(({ start, action, decision, end }) => {
  const submit = action("Submit payment");
  const authorize = action("Authorize payment");
  const approved = decision("Approved?");
  const capture = action("Capture payment");
  const reject = action("Reject payment");

  start().to(submit).to(authorize).to(approved);

  approved.when("yes").to(capture).to(end());
  approved.when("no").to(reject).to(end());
});
```

## 7. Architecture-as-code model

The architecture model should provide hierarchical elements, relationships, metadata, tags, and views.

### 7.1 Core concepts

An architecture workspace contains:

- Model elements.
- Relationships.
- Views.
- Styles.
- Themes.
- Validation rules.
- Metadata.
- Optional documentation.

### 7.2 Element kinds

Initial element kinds:

```txt
person
softwareSystem
container
component
deploymentNode
infrastructureNode
database
queue
externalSystem
boundary
group
```

The API should not hardcode cloud providers into the core model. Provider-specific icons and metadata belong in optional packages.

### 7.3 Relationship model

Relationships should support:

- Source.
- Target.
- Label.
- Description.
- Technology.
- Direction.
- Tags.
- Metadata.
- Protocol.
- Criticality.
- Ownership.
- Optional link to one or more sequence diagrams.

Example:

```ts
api.uses(ledger, "Writes ledger entries", {
  technology: "DynamoDB SDK",
  protocol: "AWS API",
  tags: ["writes"],
});
```

### 7.4 Views

Views are projections of the model.

Initial view types:

- System context view.
- Container view.
- Component view.
- Deployment view.
- Dynamic view.
- Filtered view.
- Landscape view.

Example:

```ts
views.filtered("external-dependencies", (view) => {
  view.include((element) => element.tags.includes("external"));
  view.includeRelationships("*");
  view.autoLayout("left-right");
});
```

### 7.5 Styles

Styles should be declarative and tag-based.

```ts
workspace("Payments")(({ styles }) => {
  styles.element("database", {
    shape: "cylinder",
    fill: "#eef3ff",
  });

  styles.relationship("async", {
    line: "dashed",
  });
});
```

### 7.6 Themes

Themes should be composable TypeScript modules.

```ts
import { nordTheme } from "@drawspec/theme-nord";

export default workspace("Payments")(({ use }) => {
  use(nordTheme);
});
```

### 7.7 Architecture validation

Validation rules should be queryable and testable.

```ts
import { rule } from "@drawspec/validation";

export const requireContainerTechnology = rule("require-container-technology", (ctx) => {
  for (const container of ctx.model.elements.kind("container")) {
    if (!container.technology) {
      ctx.report({
        element: container,
        message: "Container must specify technology.",
        severity: "error",
      });
    }
  }
});
```

## 8. Diagram IR

Diagram IR is the normalized representation used between authoring APIs and renderers.

### 8.1 IR requirements

The IR must:

- Represent all supported diagram types.
- Preserve semantic identities.
- Support source maps back to TypeScript authoring locations where practical.
- Support diagnostics.
- Support layout hints.
- Support tags and metadata.
- Support rendering-independent styling.
- Be serializable to JSON.
- Be versioned.

### 8.2 Document shape

```ts
export interface DiagramDocument {
  schemaVersion: string;
  id: string;
  title: string;
  kind: DiagramKind;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  annotations: DiagramAnnotation[];
  layout: LayoutSpec;
  styles: StyleSheet;
  metadata: Record<string, unknown>;
  diagnostics: Diagnostic[];
}
```

### 8.3 Diagram kinds

```ts
export type DiagramKind =
  | "architecture"
  | "sequence"
  | "class"
  | "component"
  | "deployment"
  | "state"
  | "activity"
  | "use-case"
  | "object"
  | "timing"
  | "er"
  | "graph";
```

### 8.4 Node shape

```ts
export interface DiagramNode {
  id: string;
  kind: string;
  label: string;
  description?: string;
  parentId?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}
```

### 8.5 Edge shape

```ts
export interface DiagramEdge {
  id: string;
  kind: string;
  sourceId: string;
  targetId: string;
  label?: string;
  description?: string;
  direction?: "forward" | "backward" | "bidirectional";
  tags: string[];
  metadata: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}
```

### 8.6 Source references

Source maps are difficult for runtime TypeScript authoring, but some useful source metadata can still be captured.

Possible strategies:

1. Explicit source registration from builder calls.
2. Runtime stack inspection in development mode.
3. TypeScript compiler API analysis for `.diagram.ts` files.
4. Hybrid approach: simple source hints at runtime, richer source maps in CLI/LSP.

For v1, source refs are best-effort.

```ts
export interface SourceRef {
  file?: string;
  line?: number;
  column?: number;
  symbol?: string;
}
```

## 9. Package architecture

The monorepo should be modular and publishable as independent packages.

### 9.1 Proposed monorepo layout

```txt
packages/
  core/
  architecture/
  validation/
  uml-sequence/
  uml-class/
  uml-state/
  uml-activity/
  uml-component/
  uml-deployment/
  layout/
  layout-dagre/
  layout-elk/
  renderer-svg/
  renderer-canvas/
  renderer-html/
  renderer-mermaid/
  renderer-plantuml/
  renderer-d2/
  cli/
  lsp/
  vite-plugin/
  react/
  themes/
  icons/
  testkit/
  examples/
  docs-site/
```

### 9.2 `@drawspec/core`

Responsibilities:

- Shared types.
- Diagram IR.
- Diagnostic types.
- Builder primitives.
- ID generation.
- Symbol registry.
- Common utilities.
- Serialization.
- Schema versioning.

Should not depend on renderer packages.

### 9.3 `@drawspec/architecture`

Responsibilities:

- Workspace builder.
- Architecture model.
- Architecture views.
- Elements.
- Relationships.
- Tags.
- Styles.
- Themes.
- Model-to-IR compilation.

Depends on:

- `@drawspec/core`
- optionally `@drawspec/validation`

### 9.4 `@drawspec/validation`

Responsibilities:

- Rule engine.
- Built-in rule definitions.
- Diagnostic formatting.
- Rule configuration.
- Test helper integration.

Should work against both:

- Architecture models.
- Diagram IR.

### 9.5 UML packages

Each UML package owns one domain:

- `@drawspec/uml-sequence`
- `@drawspec/uml-class`
- `@drawspec/uml-state`
- `@drawspec/uml-activity`
- `@drawspec/uml-component`
- `@drawspec/uml-deployment`

Responsibilities:

- Typed authoring API.
- Domain model.
- Domain validation.
- Compilation to Diagram IR.
- Domain-specific layout hints.

### 9.6 `@drawspec/layout`

Responsibilities:

- Layout interfaces.
- Layout graph model.
- Layout pipeline.
- Layout caching.
- Coordinate system conventions.
- Built-in simple layout strategies.

The core layout package should not commit to a single external algorithm.

### 9.7 Layout adapters

Potential packages:

- `@drawspec/layout-dagre`
- `@drawspec/layout-elk`
- `@drawspec/layout-tree`
- `@drawspec/layout-sequence`

These should be optional.

The sequence layout should likely be first-party rather than outsourced, because sequence diagrams have specific semantics and are easier to layout deterministically.

### 9.8 Renderers

Potential packages:

- `@drawspec/renderer-svg`
- `@drawspec/renderer-canvas`
- `@drawspec/renderer-html`
- `@drawspec/renderer-mermaid`
- `@drawspec/renderer-plantuml`
- `@drawspec/renderer-d2`

The first-class renderer should be SVG.

Mermaid, PlantUML, and D2 should be exporters, not fidelity-critical backends.

### 9.9 `@drawspec/cli`

Responsibilities:

- File discovery.
- Module loading.
- Workspace compilation.
- Diagram compilation.
- Validation.
- Rendering.
- Watch mode.
- JSON inspection.
- Static site build.
- CI diagnostics.
- Cache management.

### 9.10 `@drawspec/lsp`

Responsibilities:

- Diagnostics in editor.
- Code actions.
- Preview integration.
- Go to definition for model elements.
- Find references for elements.
- Workspace symbol search.
- Diagram outline.
- Format support is mostly delegated to Biome because source is TypeScript.

The LSP should not reimplement TypeScript language services. It should augment them.

### 9.11 `@drawspec/vite-plugin`

Responsibilities:

- Vite integration.
- Hot reload for diagrams.
- Virtual modules for compiled diagrams.
- Dev server preview endpoints.
- Static asset generation.

### 9.12 `@drawspec/react`

Responsibilities:

- `<Diagram />` component.
- `<ArchitectureExplorer />` component.
- Zoom/pan controls.
- Theme support.
- Accessibility support.
- Interactive relationship highlighting.
- Search/filter in large diagrams.

## 10. Repository setup

### 10.1 Runtime and package management

Bun should be the default runtime and package manager.

Suggested root `package.json`:

```json
{
  "name": "diagramkit",
  "private": true,
  "workspaces": ["packages/*", "examples/*"],
  "type": "module",
  "scripts": {
    "check": "biome check . && bun run typecheck && bun test",
    "format": "biome check --write .",
    "lint": "biome lint .",
    "typecheck": "tsc -b",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "build": "bun run --filter './packages/*' build",
    "changeset": "changeset",
    "release": "bun run check && changeset version && bun run build"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "@changesets/cli": "latest",
    "typescript": "latest"
  }
}
```

### 10.2 TypeScript project references

Use TypeScript project references for package-level type checking.

Root `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/architecture" },
    { "path": "./packages/validation" },
    { "path": "./packages/uml-sequence" },
    { "path": "./packages/renderer-svg" },
    { "path": "./packages/cli" }
  ]
}
```

### 10.3 Package build strategy

Each package should emit:

- ESM JavaScript.
- Type declarations.
- Source maps.

Bun can run TypeScript directly during development, but packages should publish compiled output.

### 10.4 Versioning

Use Changesets for package versioning.

Versioning strategy:

- Pre-1.0: synchronized versions are acceptable.
- After API stabilization: consider independent versioning only if necessary.

## 11. CLI specification

The CLI binary name is open. Possible names:

- `diagram`
- `diagramkit`
- `dk`
- `archdraw`
- `typeuml`

This spec uses `diagramkit`.

### 11.1 Commands

```txt
diagramkit check [files...]
diagramkit render [files...]
diagramkit watch [files...]
diagramkit inspect [files...]
diagramkit build-site [files...]
diagramkit export [files...]
diagramkit list [files...]
diagramkit cache clean
```

### 11.2 `check`

Runs compilation and validation.

```txt
diagramkit check "docs/**/*.diagram.ts"
```

Options:

```txt
--config <path>
--format pretty|json|github|junit
--fail-on warning|error
--watch
--cache
--no-cache
```

### 11.3 `render`

Renders diagrams.

```txt
diagramkit render "docs/**/*.diagram.ts" --out dist/diagrams
```

Options:

```txt
--out <dir>
--format svg|png|html|json
--theme <name>
--renderer svg|canvas|html
--layout <name>
--watch
```

PNG export can be implemented via SVG to PNG conversion later.

### 11.4 `watch`

Starts a local preview server.

```txt
diagramkit watch docs
```

Options:

```txt
--port <number>
--host <host>
--open
--renderer svg|canvas
--debounce <ms>
```

### 11.5 `inspect`

Prints model or IR information.

```txt
diagramkit inspect docs/architecture.arch.ts --format json
```

Options:

```txt
--format pretty|json
--view <view-id>
--model
--ir
--relationships
--elements
```

### 11.6 `build-site`

Builds a static documentation site.

```txt
diagramkit build-site docs --out dist/site
```

V1 can keep this minimal, or defer it if Vite/React integration already covers static docs.

### 11.7 `export`

Exports to other diagram formats.

```txt
diagramkit export docs/architecture.arch.ts --format mermaid --out generated
```

Formats:

```txt
json
mermaid
plantuml
d2
dot
```

The exporters are best-effort.

### 11.8 CI diagnostics

`--format github` should emit GitHub Actions annotations.

Example:

```txt
::error file=docs/architecture.arch.ts,line=42,col=12,title=require-container-technology::Container "API" must specify technology.
```

## 12. Configuration

Config should be optional. Defaults should be good.

Possible config file names:

```txt
diagramkit.config.ts
diagramkit.config.mts
diagramkit.config.json
```

TypeScript config is preferred.

Example:

```ts
import { defineConfig } from "@drawspec/cli/config";
import { strictArchitectureRules } from "@drawspec/validation/presets";

export default defineConfig({
  files: ["docs/**/*.diagram.ts", "docs/**/*.arch.ts"],
  outDir: "dist/diagrams",
  rules: {
    ...strictArchitectureRules,
    "architecture/require-owner": "warn",
    "architecture/no-frontend-to-database": "error",
  },
  render: {
    defaultFormat: "svg",
    theme: "system",
  },
  preview: {
    port: 4371,
    debounceMs: 80,
  },
});
```

Rule config should support:

```ts
type RuleSeverity = "off" | "info" | "warn" | "error";

type RuleConfig =
  | RuleSeverity
  | [RuleSeverity, Record<string, unknown>];
```

## 13. Validation and linting

Validation is a core feature, not an afterthought.

### 13.1 Diagnostic shape

```ts
export interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  source?: SourceRef;
  target?: {
    kind: "element" | "relationship" | "view" | "diagram" | "node" | "edge";
    id: string;
  };
  help?: string;
}
```

### 13.2 Rule API

```ts
export interface RuleContext {
  report(diagnostic: DiagnosticInput): void;
  model?: ArchitectureModel;
  diagram?: DiagramDocument;
  config: RuleConfigContext;
}

export interface Rule {
  name: string;
  meta: {
    description: string;
    recommended?: boolean;
    fixable?: boolean;
  };
  create(context: RuleContext): RuleVisitor | void;
}
```

### 13.3 Built-in architecture rules

Initial architecture rules:

```txt
architecture/require-owner
architecture/require-technology
architecture/require-description
architecture/no-frontend-to-database
architecture/no-unknown-tags
architecture/no-orphan-elements
architecture/no-duplicate-names-in-scope
architecture/no-empty-views
architecture/no-unreachable-containers
architecture/max-view-complexity
architecture/require-external-system-owner
architecture/require-relationship-description
architecture/no-circular-dependencies
architecture/no-implicit-relationships
```

### 13.4 Built-in diagram rules

Initial diagram rules:

```txt
diagram/require-title
diagram/max-nodes
diagram/max-edges
diagram/no-empty-label
diagram/no-duplicate-node-id
diagram/no-floating-node
diagram/no-hidden-node
diagram/no-invalid-style-ref
diagram/no-unknown-icon
diagram/prefer-stable-ids
```

### 13.5 Sequence rules

```txt
sequence/no-unknown-participant
sequence/no-self-message-without-label
sequence/no-empty-fragment
sequence/max-lifelines
sequence/max-message-depth
sequence/require-response-for-sync-call
```

### 13.6 Class diagram rules

```txt
class/no-empty-class
class/no-duplicate-member
class/no-circular-inheritance
class/no-unknown-type-ref
class/require-visibility
```

### 13.7 Rule presets

Recommended presets:

```ts
import { recommended } from "@drawspec/validation/presets";
import { strictArchitecture } from "@drawspec/validation/presets";
import { documentation } from "@drawspec/validation/presets";
```

## 14. Rendering

### 14.1 Primary renderer

The primary renderer should output SVG.

Why SVG:

- Works in docs.
- Works in browsers.
- Works in static sites.
- Works in CI artifacts.
- Can be embedded in Markdown.
- Can be styled and inspected.
- Can support links and accessibility metadata.

### 14.2 Rendering pipeline

```txt
TypeScript source
  -> authoring API builder
  -> domain model
  -> Diagram IR
  -> validation diagnostics
  -> layout graph
  -> positioned diagram
  -> SVG renderer
```

### 14.3 Renderer interface

```ts
export interface Renderer<TOutput = string> {
  name: string;
  render(document: DiagramDocument, options: RenderOptions): Promise<TOutput>;
}
```

### 14.4 Layout interface

```ts
export interface LayoutEngine {
  name: string;
  supports(document: DiagramDocument): boolean;
  layout(document: DiagramDocument, options: LayoutOptions): Promise<PositionedDiagram>;
}
```

### 14.5 Built-in layout strategies

Initial strategies:

- Manual layout hints.
- Left-right graph layout.
- Top-bottom graph layout.
- Sequence diagram layout.
- Tree layout.
- Grid layout.

### 14.6 SVG accessibility

SVG output should include:

- `<title>`
- `<desc>`
- ARIA attributes where relevant.
- Text as text where possible, not paths.
- Stable IDs for elements.
- Link support.
- Metadata comments or embedded JSON where useful.

### 14.7 Styling

Renderer styling should be theme-driven and deterministic.

Style priority:

1. Explicit node/edge style.
2. Tag-based style.
3. Diagram kind defaults.
4. Global theme defaults.

## 15. Preview system

The preview system should optimize for author feedback.

### 15.1 Preview goals

- Near real-time updates.
- Clear diagnostics.
- Fast initial load.
- Incremental updates.
- Stable layout when small edits happen.
- Link from preview element to source when possible.
- Search and filter for architecture models.
- Multiple renderer modes eventually.

### 15.2 Watch mode pipeline

```txt
File watcher detects change
  -> dependency graph invalidates affected modules
  -> changed modules reloaded
  -> diagrams/workspaces recompiled
  -> validation runs
  -> IR diff calculated
  -> layout updated
  -> preview websocket sends patch or full document
  -> browser updates view
```

### 15.3 Caching

Cache keys should include:

- Source file content hash.
- Imported file content hashes.
- Package versions.
- Config hash.
- Theme hash.
- Renderer version.
- Layout engine version.

### 15.4 Preview UI

Minimum v1 preview UI:

- Sidebar with diagrams/views.
- Main SVG preview.
- Diagnostics panel.
- Search.
- Zoom/pan.
- Auto-refresh.
- Theme toggle.

Later:

- Relationship filtering.
- Architecture explorer.
- Element details panel.
- Click-to-source.
- Comparison view.
- Render performance overlay.

## 16. Testing strategy

TDD should be central to development.

### 16.1 Test layers

Use these layers:

1. Unit tests for builders.
2. Unit tests for IR compilation.
3. Unit tests for validation rules.
4. Golden tests for rendered SVG.
5. Snapshot tests for JSON IR.
6. Performance tests for large workspaces.
7. CLI integration tests.
8. Preview server tests.
9. Exporter tests.
10. Example project smoke tests.

### 16.2 Builder test example

```ts
import { describe, expect, test } from "bun:test";
import diagram from "./payment.sequence";

describe("payment sequence", () => {
  test("contains authorization call", () => {
    const ir = diagram.compile();

    expect(ir.edges).toContainEqual(
      expect.objectContaining({
        label: "Authorize",
      }),
    );
  });
});
```

### 16.3 Architecture rule test example

```ts
import { expect, test } from "bun:test";
import workspace from "../docs/architecture.arch";

test("frontend does not talk directly to database", () => {
  const model = workspace.compileModel();

  const violations = model.relationships.filter(
    (relationship) =>
      relationship.source.tags.includes("frontend") &&
      relationship.target.tags.includes("database"),
  );

  expect(violations).toHaveLength(0);
});
```

### 16.4 Renderer golden test

```ts
import { expect, test } from "bun:test";
import { renderSvg } from "@drawspec/renderer-svg";
import diagram from "./fixtures/simple.sequence";

test("renders stable SVG", async () => {
  const svg = await renderSvg(diagram.compile());
  expect(svg).toMatchSnapshot();
});
```

### 16.5 Snapshot policy

Snapshots should be stable and meaningful.

Avoid snapshots that include:

- Random IDs.
- Timestamps.
- Machine-specific paths.
- Unstable layout jitter.
- Dependency-specific noise.

### 16.6 Performance tests

Performance tests should cover:

- 100 diagrams.
- 1 000 diagrams.
- 10 000 architecture elements.
- Large sequence diagrams.
- Large component graphs.
- Watch-mode incremental update.
- Cold render.
- Warm render.
- Cache hit.
- Cache miss.

## 17. Performance requirements

### 17.1 Authoring feedback targets

Targets for local development on a modern machine:

```txt
Small diagram compile:       < 20 ms
Small diagram render:        < 50 ms
Warm preview update:         < 100 ms
Medium workspace check:      < 1 s
Large workspace cached check: < 3 s
```

These are goals, not hard guarantees.

### 17.2 Performance design

Use:

- Content hashing.
- Lazy compilation.
- Dependency graph invalidation.
- Worker threads for expensive rendering.
- Debounced preview rendering.
- Persistent cache.
- Renderer-level memoization.
- Layout cache keyed by graph topology.
- Stable IDs to avoid unnecessary rerenders.

### 17.3 Avoiding slow patterns

Avoid:

- Rebuilding all diagrams on every file change.
- Rendering PNG by default.
- Running expensive layouts synchronously on every keystroke.
- Loading every package in every CLI command.
- Large dynamic imports during hot paths.
- Unbounded graph layout on pathological diagrams.

## 18. Developer experience

### 18.1 IDE support

Because source files are TypeScript, users get:

- Autocomplete.
- Go to definition.
- Rename refactor.
- Inline type errors.
- Import organization.
- Biome format on save.
- Standard editor integrations.

DrawSpec should add:

- Preview panel.
- Diagram diagnostics.
- Model explorer.
- Generated IR inspection.
- Render output preview.
- Architecture relationship navigation.

### 18.2 Biome integration

Biome should format and lint authoring files as TypeScript.

This means DrawSpec should avoid syntax patterns that fight normal formatting.

Recommended API style:

- Builders instead of chained DSLs when chains become too long.
- Plain objects for options.
- Named imports.
- Stable function names.
- Minimal magic.

### 18.3 TDD workflow

Expected workflow:

```txt
1. Write architecture model or diagram.
2. Write tests for important architectural constraints.
3. Run `bun test`.
4. Run `diagramkit check`.
5. Preview locally with `diagramkit watch`.
6. Render SVGs in CI.
```

### 18.4 Documentation authoring

DrawSpec should support using diagrams in:

- Markdown.
- MDX.
- VitePress.
- Docusaurus.
- Astro.
- Storybook.
- Custom React apps.
- Static HTML output.

## 19. API design guidelines

### 19.1 Prefer typed builders over strings

Good:

```ts
api.uses(database, "Reads payment state");
```

Avoid:

```ts
rel("api -> database: Reads payment state");
```

Strings are still needed for labels, descriptions, and custom metadata, but identities and relationships should be typed where possible.

### 19.2 Keep IDs stable

Users should be able to provide explicit IDs:

```ts
const api = container("API", {
  id: "payment-api",
  technology: "TypeScript",
});
```

If no ID is provided, generate one from scope and name, but warn when it may be unstable.

### 19.3 Make composition easy

Users should be able to split models:

```ts
import { payments } from "./systems/payments";
import { identity } from "./systems/identity";

export default workspace("Platform")(({ model }) => {
  model.use(payments);
  model.use(identity);
});
```

### 19.4 Avoid global mutable state

Builder APIs should avoid hidden process-wide registries. Context should be explicit.

### 19.5 Support escape hatches

Some diagrams need custom nodes, edges, icons, annotations, or layout hints.

Escape hatches should exist, but they should be typed and isolated.

## 20. Static site generation

Static site generation is valuable, but should not dominate v1.

### 20.1 Site features

Possible generated site features:

- Diagram index.
- Architecture model explorer.
- Search.
- Tags.
- Element pages.
- Relationship pages.
- View pages.
- Embedded SVGs.
- Diagnostics report.
- Exported JSON.

### 20.2 Site command

```txt
diagramkit build-site docs --out dist/architecture
```

### 20.3 React-first implementation

The static site can be built from the same React components provided by `@drawspec/react`.

## 21. Exporters

Exporters are optional compatibility features.

### 21.1 Export principles

Exporters should be:

- Best-effort.
- Explicit about unsupported features.
- Covered by tests.
- Useful for interoperability.
- Not the primary rendering path.

### 21.2 Mermaid exporter

Useful for:

- GitHub Markdown.
- Lightweight docs.
- Simple diagrams.

Potential limitations:

- UML coverage mismatch.
- Styling mismatch.
- Architecture semantics lost.

### 21.3 PlantUML exporter

Useful for:

- Legacy pipelines.
- Teams already rendering PlantUML.
- Compatibility bridge.

Potential limitations:

- PlantUML cannot express all DrawSpec metadata.
- Visual output will differ.
- Exported syntax may be verbose.

### 21.4 D2 exporter

Useful for:

- General graph diagrams.
- Modern text-to-diagram pipelines.

Potential limitations:

- UML semantics may be reduced.

### 21.5 JSON exporter

The JSON exporter is important for integrations and should be first-class.

## 22. Editor and LSP

Because the authoring language is TypeScript, a full custom language server is not required for v1. But an augmentation server can still be useful.

### 22.1 LSP responsibilities

- Validate compiled diagrams.
- Show architecture diagnostics.
- Provide preview integration.
- Provide model element references.
- Provide generated diagram outline.
- Provide commands for rendering current diagram.
- Provide commands for opening preview.

### 22.2 Avoid duplicating TypeScript

The LSP should not implement:

- TypeScript parsing.
- TypeScript autocomplete.
- TypeScript rename.
- TypeScript diagnostics.

It should rely on the existing TypeScript language service.

### 22.3 VS Code extension

Initial extension features:

- Preview current diagram.
- Start watch server.
- Show diagnostics.
- Open rendered SVG.
- Inspect compiled IR.
- List workspace views.

Later:

- Click preview element to source.
- Architecture explorer sidebar.
- Relationship search.
- Rule quick fixes.

## 23. Security model

Because diagrams are TypeScript, executing diagram files means executing code. This is powerful and dangerous.

### 23.1 Security implications

DrawSpec must be clear that compiling diagrams executes trusted local code.

This is similar to:

- Build scripts.
- Test files.
- Vite config.
- Storybook stories.
- Infrastructure-as-code.

### 23.2 Mitigations

Possible mitigations:

- Do not auto-execute untrusted files without user action.
- Support `--trusted` or workspace trust in editor plugins.
- Document security implications clearly.
- Use worker isolation where useful.
- Consider a restricted declarative JSON output mode later.
- Avoid network access in core packages.

### 23.3 CI use

CI environments already execute repository code. DrawSpec should behave predictably in CI and avoid hidden network calls.

## 24. Accessibility

Accessibility matters because diagrams often become documentation.

### 24.1 Output requirements

Rendered diagrams should support:

- Text labels as real text.
- SVG title and description.
- Keyboard navigation later.
- High contrast themes.
- Reduced motion for interactive viewers.
- ARIA labels for interactive components.
- Optional textual summary generation.

### 24.2 Textual summaries

Architecture views can generate summaries:

```txt
The "payments-containers" view contains Customer, Web App, API, and Ledger DB.
Customer uses Web App to create payment.
Web App calls API using POST /payments.
API writes ledger entries to Ledger DB.
```

This is useful for accessibility and documentation review.

## 25. Theming and icons

### 25.1 Theme package

A theme package should include:

- Colors.
- Fonts.
- Node styles.
- Edge styles.
- Spacing.
- Diagram kind defaults.

### 25.2 Icon packages

Potential icon packages:

- `@drawspec/icons-aws`
- `@drawspec/icons-azure`
- `@drawspec/icons-gcp`
- `@drawspec/icons-kubernetes`
- `@drawspec/icons-simple`

Provider-specific packages should be optional.

### 25.3 Icon strategy

Icons should be:

- SVG-based.
- Tree-shakeable.
- Optional.
- Accessible.
- Renderable without external network calls.

## 26. Compatibility with architecture-as-code tools

DrawSpec should not try to replace every architecture tool immediately.

### 26.1 Structurizr compatibility

Possible later features:

- Export to Structurizr JSON.
- Import from Structurizr JSON.
- Export C4-like views.
- Map DrawSpec architecture model to Structurizr concepts.

### 26.2 LikeC4 compatibility

Possible later features:

- Export to LikeC4 DSL, if practical.
- Import LikeC4 model, if practical.
- Share conceptual model patterns.

### 26.3 OpenTelemetry and runtime metadata

Future architecture drift detection could use runtime metadata from logs, traces, cloud inventories, or service catalogs.

This is not v1.

## 27. Roadmap

### 27.1 Phase 0: Research and prototype

Goals:

- Validate TypeScript authoring API.
- Validate IR design.
- Render simple sequence diagrams.
- Render simple architecture views.
- Test Bun monorepo setup.
- Measure preview loop speed.

Deliverables:

```txt
@drawspec/core
@drawspec/uml-sequence
@drawspec/architecture
@drawspec/renderer-svg
@drawspec/cli
```

### 27.2 Phase 1: MVP

Goals:

- Sequence diagrams.
- Architecture model.
- System context and container views.
- SVG renderer.
- CLI check/render/watch.
- Validation rule engine.
- Basic React viewer.
- Bun test coverage.
- Biome formatted repo.

Exit criteria:

- Real example docs can be authored and rendered.
- CI can validate diagrams.
- Preview updates quickly enough for normal authoring.
- SVG output is stable and readable.

### 27.3 Phase 2: UML expansion

Add:

- Class diagrams.
- State diagrams.
- Component diagrams.
- Deployment diagrams.
- Limited activity diagrams.
- More validation rules.
- More layout support.

### 27.4 Phase 3: Editor integration

Add:

- VS Code extension.
- Preview panel.
- Diagnostics.
- Model explorer.
- Render current diagram command.
- Open generated SVG command.

### 27.5 Phase 4: Exporters and docs ecosystem

Add:

- Mermaid exporter.
- PlantUML exporter.
- D2 exporter.
- JSON exporter stabilization.
- Vite plugin.
- MDX examples.
- Static site generation.

### 27.6 Phase 5: Large workspace support

Add:

- Persistent cache.
- Incremental compile.
- Dependency graph.
- Workspace query API.
- Performance benchmarks.
- Large architecture explorer.

### 27.7 Phase 6: Advanced architecture features

Add:

- Dynamic views from model relationships.
- Architecture decision records integration.
- Drift detection hooks.
- Ownership metadata.
- Service catalog integration.
- Policy packs.

## 28. MVP cut

A realistic MVP should not try to cover everything.

### 28.1 MVP packages

```txt
@drawspec/core
@drawspec/architecture
@drawspec/uml-sequence
@drawspec/validation
@drawspec/layout
@drawspec/renderer-svg
@drawspec/cli
@drawspec/react
@drawspec/testkit
```

### 28.2 MVP features

- TypeScript authoring.
- Architecture workspace.
- Person, software system, container, database.
- System context view.
- Container view.
- Sequence diagrams.
- SVG rendering.
- CLI render.
- CLI check.
- CLI watch.
- Basic validation rules.
- Bun test examples.
- React viewer.
- Basic theme support.

### 28.3 MVP non-features

- No class diagrams.
- No activity diagrams.
- No PlantUML import.
- No advanced graph layout.
- No static site generator.
- No custom editor extension.
- No external exporters except JSON.
- No PNG export unless easy.

## 29. Risks

### 29.1 Scope explosion

Risk: Trying to match all of PlantUML too early.

Mitigation:

- Define staged diagram support.
- Treat PlantUML as benchmark, not compatibility requirement.
- Keep v1 small.
- Use optional packages.

### 29.2 Layout complexity

Risk: Graph layout becomes the whole project.

Mitigation:

- Make layout pluggable.
- Start with sequence and simple architecture views.
- Use external layout libraries where pragmatic.
- Avoid promising pixel-perfect control.

### 29.3 TypeScript execution security

Risk: Users expect diagrams to be safe data, but they are executable code.

Mitigation:

- Document trust model.
- Use workspace trust in editor plugins.
- Avoid executing untrusted repos automatically.

### 29.4 API ergonomics

Risk: TypeScript authoring becomes too verbose compared with PlantUML.

Mitigation:

- Provide concise builders.
- Provide helper factories.
- Allow composition.
- Keep examples tight.
- Use sensible defaults.

### 29.5 Rendering quality

Risk: Output looks worse than PlantUML/Mermaid/D2.

Mitigation:

- Invest early in visual defaults.
- Use stable spacing.
- Provide themes.
- Prioritize sequence and architecture render quality.
- Avoid ugly default typography.

### 29.6 Ecosystem adoption

Risk: Teams do not want another diagram tool.

Mitigation:

- Integrate with existing docs.
- Export to common formats.
- Make TypeScript authoring the killer feature.
- Provide migration examples.
- Make CI validation valuable even without full renderer adoption.

## 30. Open questions

1. What should the project be called?
2. Should the CLI be `diagramkit`, `diagram`, or something shorter?
3. Should Vitest be supported officially in addition to Bun test?
4. Should the core support Node.js runtime officially, or only Bun?
5. How much visual styling should be core vs theme packages?
6. Should architecture elements require explicit stable IDs?
7. Should render output be deterministic across machines?
8. Should layout use an optional WASM engine?
9. Should Mermaid export be in v1 or later?
10. Should static site generation be a first-party concern?
11. How much C4 vocabulary should be exposed directly?
12. Should the model support nested workspaces?
13. Should diagrams be able to import and reference model elements directly?
14. Should sequence diagrams be allowed to generate dynamic views?
15. Should there be a JSON-only declarative mode for locked-down environments?

## 31. Naming ideas

These are placeholders only.

### 31.1 Technical names

```txt
DrawSpec
TypeDiagram
TypeUML
GraphKit
ArchKit
ModelDraw
TypedDiagrams
```

### 31.2 More product-like names

```txt
Structura
Glyph
Trellis
Blueprint
Carta
Lattice
Axon
```

### 31.3 Naming criteria

The name should be:

- Short.
- Searchable.
- npm-available if possible.
- Not tied only to UML.
- Not tied only to architecture.
- Easy to pronounce.
- Suitable for packages and CLI.

## 32. Example user workflows

### 32.1 Local authoring

```txt
bun install
bun diagramkit watch docs
```

User edits `docs/architecture.arch.ts`.

Preview updates automatically.

### 32.2 CI validation

```txt
bun install --frozen-lockfile
bun run check
bun diagramkit check docs --format github
bun diagramkit render docs --out dist/diagrams
```

### 32.3 Documentation build

```txt
bun diagramkit render docs --out docs/public/diagrams
bun run docs:build
```

### 32.4 Architecture tests

```txt
bun test test/architecture
```

Tests assert architecture rules over compiled models.

## 33. Example root scripts for consumer projects

```json
{
  "scripts": {
    "check": "biome check . && bun run typecheck && bun test && bun run diagrams:check",
    "format": "biome check --write .",
    "typecheck": "tsc --noEmit",
    "diagrams:check": "diagramkit check \"docs/**/*.arch.ts\" \"docs/**/*.diagram.ts\"",
    "diagrams:watch": "diagramkit watch docs",
    "diagrams:render": "diagramkit render docs --out dist/diagrams"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "@drawspec/architecture": "latest",
    "@drawspec/cli": "latest",
    "@drawspec/renderer-svg": "latest",
    "@drawspec/uml-sequence": "latest",
    "typescript": "latest"
  }
}
```

## 34. First implementation plan

### 34.1 Week 1: Core skeleton

- Create Bun workspace.
- Add Biome.
- Add TypeScript project references.
- Create `@drawspec/core`.
- Define Diagram IR.
- Define diagnostics.
- Define testkit.
- Add basic unit tests.

### 34.2 Week 2: Sequence diagrams

- Create `@drawspec/uml-sequence`.
- Implement participants.
- Implement messages.
- Implement simple fragments.
- Compile to IR.
- Render simple SVG sequence diagram.
- Add golden tests.

### 34.3 Week 3: Architecture model

- Create `@drawspec/architecture`.
- Implement workspace.
- Implement elements.
- Implement relationships.
- Implement context/container views.
- Compile views to IR.
- Add validation hooks.

### 34.4 Week 4: CLI

- Create `@drawspec/cli`.
- Implement file discovery.
- Implement module loading.
- Implement `check`.
- Implement `render`.
- Implement pretty and JSON diagnostics.
- Add integration tests.

### 34.5 Week 5: Watch and preview

- Implement watch mode.
- Implement preview server.
- Add React viewer.
- Add websocket updates.
- Add diagnostics panel.
- Add example project.

### 34.6 Week 6: Validation rules and polish

- Add first rule pack.
- Add CI output.
- Add docs.
- Add examples.
- Add performance baseline.
- Stabilize public API.

## 35. Success criteria

DrawSpec succeeds if it can make this true:

```txt
A TypeScript team can define architecture and UML-style diagrams as code,
format them with Biome, validate them in CI, test architectural constraints,
preview them locally with low latency, and render stable SVGs for docs.
```

Early success metrics:

- Time to first rendered diagram under 5 minutes.
- Preview update under 100 ms for small diagrams.
- Good SVG output for sequence diagrams and architecture views.
- Clear CI diagnostics.
- Useful built-in validation rules.
- No need for Java or PlantUML in the core workflow.
- Users can write meaningful architecture tests in plain TypeScript.

## 36. Final recommendation

Build this as a TypeScript-native platform, not as PlantUML tooling.

The winning scope is:

```txt
PlantUML-like diagram breadth over time,
LikeC4-style architecture semantics from the start,
TypeScript authoring always,
Biome/Bun/TDD as the default development culture,
fast SVG previews as the authoring experience.
```

The MVP should stay small: architecture views, sequence diagrams, validation, SVG rendering, CLI, preview, and tests. That is enough to prove the model. Once that foundation is good, class/state/component/deployment/activity diagrams can be added as focused packages.

The hardest parts will be API ergonomics, layout quality, and scope control. The strongest differentiator is not "we can draw diagrams". It is that diagrams become normal, typed, testable, refactorable code.
