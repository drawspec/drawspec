import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import type { ArchitectureElementLike, ArchitectureModelLike, Rule } from "../index";
import {
  architectureRules,
  diagramRules,
  noDuplicateNamesInScopeRule,
  noDuplicateNodeIdRule,
  noEmptyLabelRule,
  noFrontendToDatabaseRule,
  noOrphanElementsRule,
  RuleEngine,
  recommended,
  recommendedRules,
  requireTechnologyRule,
  requireTitleRule,
} from "../index";

function element(
  id: string,
  kind: ArchitectureElementLike["kind"],
  name: string,
  options: Partial<ArchitectureElementLike> = {}
): ArchitectureElementLike {
  return { id, kind, name, tags: [kind], ...options };
}

function model(
  elements: readonly ArchitectureElementLike[],
  relationships: ArchitectureModelLike["relationships"] = [],
  views: ArchitectureModelLike["views"] = []
): ArchitectureModelLike {
  return { elements, relationships, views };
}

function diagram(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    schemaVersion: "1.0.0",
    id: "diagram_a",
    title: "System",
    kind: "architecture",
    nodes: [{ id: "node_a", kind: "container", label: "API" }],
    edges: [
      { id: "edge_a_b", kind: "uses", sourceId: "node_a", targetId: "node_b", label: "Uses" },
    ],
    groups: [],
    annotations: [],
    ...overrides,
  };
}

function diagnosticsFor(
  rule: Rule,
  input: { model?: ArchitectureModelLike; diagram?: DiagramDocument }
) {
  return new RuleEngine([rule]).validate(input).diagnostics;
}

describe("architecture rules", () => {
  test("require-technology accepts containers with technology", () => {
    const api = element("api", "container", "API", { technology: "Bun" });
    expect(diagnosticsFor(requireTechnologyRule, { model: model([api]) })).toHaveLength(0);
  });

  test("require-technology reports containers without technology", () => {
    const api = element("api", "container", "API");
    const diagnostics = diagnosticsFor(requireTechnologyRule, { model: model([api]) });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.target).toBe("element:api");
  });

  test("require-technology reports databases without technology", () => {
    const ledger = element("ledger", "database", "Ledger");
    expect(diagnosticsFor(requireTechnologyRule, { model: model([ledger]) })).toHaveLength(1);
  });

  test("no-frontend-to-database accepts frontend to API relationship", () => {
    const web = element("web", "container", "Web", { tags: ["container", "frontend"] });
    const api = element("api", "container", "API");
    const architecture = model(
      [web, api],
      [{ id: "rel", source: web, target: api, label: "Calls" }]
    );
    expect(diagnosticsFor(noFrontendToDatabaseRule, { model: architecture })).toHaveLength(0);
  });

  test("no-frontend-to-database reports direct database access", () => {
    const web = element("web", "container", "Web", { tags: ["frontend"] });
    const db = element("db", "database", "DB", { technology: "PostgreSQL" });
    const architecture = model([web, db], [{ id: "rel", source: web, target: db, label: "Reads" }]);
    expect(diagnosticsFor(noFrontendToDatabaseRule, { model: architecture })).toHaveLength(1);
  });

  test("no-orphan-elements accepts related elements", () => {
    const user = element("user", "person", "User");
    const app = element("app", "softwareSystem", "App");
    const architecture = model([user, app], [{ id: "rel", source: user, target: app }]);
    expect(diagnosticsFor(noOrphanElementsRule, { model: architecture })).toHaveLength(0);
  });

  test("no-orphan-elements accepts elements included in views", () => {
    const app = element("app", "softwareSystem", "App");
    const architecture = model([app], [], [{ id: "view", includedElements: [app] }]);
    expect(diagnosticsFor(noOrphanElementsRule, { model: architecture })).toHaveLength(0);
  });

  test("no-orphan-elements reports isolated elements", () => {
    const app = element("app", "softwareSystem", "App");
    expect(diagnosticsFor(noOrphanElementsRule, { model: model([app]) })).toHaveLength(1);
  });

  test("no-duplicate-names-in-scope accepts duplicate names in different parents", () => {
    const systemA = element("system_a", "softwareSystem", "A");
    const systemB = element("system_b", "softwareSystem", "B");
    const apiA = element("api_a", "container", "API", { parent: systemA });
    const apiB = element("api_b", "container", "API", { parent: systemB });
    expect(
      diagnosticsFor(noDuplicateNamesInScopeRule, { model: model([systemA, systemB, apiA, apiB]) })
    ).toHaveLength(0);
  });

  test("no-duplicate-names-in-scope reports sibling duplicates", () => {
    const first = element("first", "container", "API");
    const second = element("second", "container", "api");
    expect(
      diagnosticsFor(noDuplicateNamesInScopeRule, { model: model([first, second]) })
    ).toHaveLength(1);
  });
});

describe("diagram rules", () => {
  test("require-title accepts titled diagrams", () => {
    expect(diagnosticsFor(requireTitleRule, { diagram: diagram() })).toHaveLength(0);
  });

  test("require-title reports missing titles", () => {
    expect(diagnosticsFor(requireTitleRule, { diagram: diagram({ title: " " }) })).toHaveLength(1);
  });

  test("no-empty-label accepts labelled nodes and edges", () => {
    expect(diagnosticsFor(noEmptyLabelRule, { diagram: diagram() })).toHaveLength(0);
  });

  test("no-empty-label reports blank node labels", () => {
    const doc = diagram({ nodes: [{ id: "node_a", kind: "container", label: "" }], edges: [] });
    expect(diagnosticsFor(noEmptyLabelRule, { diagram: doc })).toHaveLength(1);
  });

  test("no-empty-label reports blank edge labels", () => {
    const doc = diagram({
      edges: [{ id: "edge", kind: "uses", sourceId: "a", targetId: "b", label: " " }],
    });
    expect(diagnosticsFor(noEmptyLabelRule, { diagram: doc })).toHaveLength(1);
  });

  test("no-duplicate-node-id accepts unique node IDs", () => {
    expect(diagnosticsFor(noDuplicateNodeIdRule, { diagram: diagram() })).toHaveLength(0);
  });

  test("no-duplicate-node-id reports duplicate node IDs", () => {
    const doc = diagram({
      nodes: [
        { id: "node_a", kind: "container", label: "API" },
        { id: "node_a", kind: "container", label: "Worker" },
      ],
    });
    expect(diagnosticsFor(noDuplicateNodeIdRule, { diagram: doc })).toHaveLength(1);
  });
});

describe("rule engine and presets", () => {
  test("engine runs architecture and diagram visitors together", () => {
    const architecture = model([element("api", "container", "API")]);
    const result = new RuleEngine([requireTechnologyRule, requireTitleRule]).validate({
      model: architecture,
      diagram: diagram({ title: undefined }),
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code).sort()).toEqual([
      "architecture/require-technology",
      "diagram/require-title",
    ]);
  });

  test("engine disables rules with off configuration", () => {
    const architecture = model([element("api", "container", "API")]);
    const result = new RuleEngine([requireTechnologyRule]).validate({
      model: architecture,
      config: { rules: { "architecture/require-technology": "off" } },
    });
    expect(result.diagnostics).toHaveLength(0);
  });

  test("engine applies severity overrides", () => {
    const architecture = model([element("api", "container", "API")]);
    const result = new RuleEngine([requireTechnologyRule]).validate({
      model: architecture,
      config: { rules: { "architecture/require-technology": "warn" } },
    });
    expect(result.diagnostics[0]?.severity).toBe("warning");
  });

  test("engine exposes tuple options to rules", () => {
    const optionRule: Rule<{ expected: string }> = {
      name: "test/options",
      meta: { description: "Uses options", recommended: true },
      create(context) {
        return {
          diagram(doc) {
            if (context.config.options?.expected !== doc.id) {
              context.report({
                message: "Unexpected diagram",
                target: { kind: "diagram", id: doc.id },
              });
            }
          },
        };
      },
    };

    const result = new RuleEngine([optionRule]).validate({
      diagram: diagram(),
      config: { rules: { "test/options": ["error", { expected: "other" }] } },
    });
    expect(result.diagnostics).toHaveLength(1);
  });

  test("recommended preset exports all recommended rules", () => {
    expect(recommendedRules).toHaveLength(architectureRules.length + diagramRules.length);
    for (const rule of recommendedRules) {
      expect(recommended.rules?.[rule.name]).toBe(rule.meta.defaultSeverity ?? "error");
    }
  });
});
