import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Validation",
  description: "Validate diagrams against rule sets and custom policies",
  content: await md`
# Validation

DrawSpec includes a validation system that checks diagrams for common errors, architectural consistency, and adherence to naming conventions. Rules can be configured individually or loaded as preset bundles.

## Built-in Presets

### Recommended

The recommended preset enables most rules with sensible defaults:

\`\`\`typescript
import { validate, recommended, recommendedRules } from "@drawspec/validation";

const result = validate({
  rules: recommendedRules,
  config: recommended,
  diagram: compiledDiagram,
});
\`\`\`

### Strict

The strict preset enforces additional constraints for production diagrams:

\`\`\`typescript
import { loadPolicyPack, recommendedRules, validate } from "@drawspec/validation";

const strict = loadPolicyPack("strict");

const result = validate({
  diagram: compiledDiagram,
  rules: recommendedRules,
  config: strict,
});
\`\`\`

### Relaxed

The relaxed preset enables only the most critical rules for quick iteration:

\`\`\`typescript
import { loadPolicyPack, recommendedRules, validate } from "@drawspec/validation";

const relaxed = loadPolicyPack("relaxed");

const result = validate({
  diagram: compiledDiagram,
  rules: recommendedRules,
  config: relaxed,
});
\`\`\`

## Validation Function

The \`validate()\` function accepts a \`ValidationInput\` and returns a \`ValidationResult\`:

\`\`\`typescript
import { validate } from "@drawspec/validation";
import { classRules } from "@drawspec/validation";

const result = validate({
  rules: classRules,
  config: { rules: { "class/no-circular-inheritance": "error" } },
  diagram: compiledDiagram,
});

if (result.diagnostics.length > 0) {
  for (const diagnostic of result.diagnostics) {
    console.log(\`[\${diagnostic.severity}] \${diagnostic.message}\`);
  }
}
\`\`\`

## Built-in Rules

### Class Rules

- \`noCircularInheritanceRule\` — detects circular class inheritance chains
- \`noDuplicateMemberRule\` — finds duplicate field or method names in a class
- \`noUnknownTypeRefRule\` — validates that referenced types are defined
- \`requireVisibilityRule\` — enforces visibility modifiers on class members

### Architecture Rules

- \`noDuplicateNamesInScopeRule\` — ensures unique element names within scope
- \`noOrphanElementsRule\` — detects elements not connected to any relationship
- \`noFrontendToDatabaseRule\` — prevents direct frontend-to-database paths
- \`requireTechnologyRule\` — enforces technology specification on containers

### Diagram Rules

- \`noDuplicateNodeIdRule\` — ensures unique node identifiers
- \`noEmptyLabelRule\` — requires labels on nodes and edges
- \`requireTitleRule\` — enforces diagram titles

### General Diagram Rules

- \`noFloatingNodeRule\` — detects nodes without connections
- \`maxNodesRule\` — limits the number of nodes in a diagram
- \`maxEdgesRule\` — limits the number of edges in a diagram

## Custom Rules

Create custom rules by implementing the \`Rule\` interface:

\`\`\`typescript
import type { Rule, RuleContext, RuleVisitor, DiagnosticTarget } from "@drawspec/validation";

export const noEmptyDescriptionRule: Rule<undefined> = {
  name: "no-empty-description",
  meta: {
    description: "Disallow elements without descriptions",
    recommended: true,
    defaultSeverity: "warn",
  },
  create(context: RuleContext<undefined>): RuleVisitor | undefined {
    return {
      architectureElement(element) {
        if (!element.description || element.description.trim() === "") {
          context.report({
            message: \`Element "\${element.name}" has no description\`,
            target: { kind: "element", id: element.id },
            help: "Add a description to improve diagram readability",
          });
        }
      },
    };
  },
};
\`\`\`

### RuleVisitor Methods

The visitor receives callbacks for different diagram constructs:

\`\`\`typescript
interface RuleVisitor {
  architectureModel?(model: ArchitectureModelLike): void;
  architectureElement?(element: ArchitectureElementLike): void;
  architectureRelationship?(relationship: ArchitectureRelationshipLike): void;
  diagram?(diagram: DiagramDocument): void;
  diagramNode?(node: DiagramNode, diagram: DiagramDocument): void;
  diagramEdge?(edge: DiagramEdge, diagram: DiagramDocument): void;
}
\`\`\`

### RuleContext

The context object provides access to configuration and the report function:

\`\`\`typescript
interface RuleContext<Options> {
  readonly model?: ArchitectureModelLike;
  readonly diagram?: DiagramDocument;
  readonly config: RuleConfigContext<Options>;
  report(diagnostic: ReportInput): void;
}
\`\`\`

## CI Integration

Run validation in CI pipelines to enforce diagram quality:

\`\`\`typescript
import { validate, recommendedRules } from "@drawspec/validation";
import { readFileSync } from "fs";

async function validateInCI() {
  const diagramPath = process.argv[2];
  const source = readFileSync(diagramPath, "utf-8");
  const doc = await compile(source);

  const result = validate({
    rules: recommendedRules,
    config: { rules: { "diagram/require-title": "error" } },
    diagram: doc,
  });

  if (result.diagnostics.length > 0) {
    console.error("Validation failed:");
    result.diagnostics.forEach((d) => console.error(\`  \${d.code}: \${d.message}\`));
    process.exit(1);
  }

  console.log("Validation passed");
}
\`\`\`

## Rule Packs

Group rules into policy packs for organizational standards:

\`\`\`typescript
import { registerPolicyPack, loadPolicyPack } from "@drawspec/validation";

registerPolicyPack({
  name: "my-org",
  description: "My organization diagram standards",
  rules: {
    "diagram/require-title": "error",
    "diagram/no-empty-label": "warn",
    "diagram/no-floating-node": "error",
  },
});

const config = loadPolicyPack("my-org");
\`\`\`

List available policy packs:

\`\`\`typescript
import { listPolicyPacks } from "@drawspec/validation";

const packs = listPolicyPacks();
console.log("Available policy packs:", packs.map((p) => p.name).join(", "));
\`\`\`
`,
});
