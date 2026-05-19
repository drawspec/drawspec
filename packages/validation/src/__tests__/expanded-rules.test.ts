import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import type { Rule } from "../index";
import {
  architectureRules,
  classRules,
  diagramRules,
  generalDiagramRules,
  maxEdgesRule,
  maxNodesRule,
  noCircularInheritanceRule,
  noDuplicateMemberRule,
  noFloatingNodeRule,
  noUnknownTypeRefRule,
  RuleEngine,
  recommended,
  recommendedRules,
  requireVisibilityRule,
} from "../index";

function diagram(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    schemaVersion: "1.0.0",
    id: "diag_1",
    title: "Test",
    kind: "class",
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    ...overrides,
  };
}

function diagnosticsFor(rule: Rule, input: { diagram?: DiagramDocument }) {
  return new RuleEngine([rule]).validate(input).diagnostics;
}

function classNode(id: string, label: string, metadata: Record<string, unknown> = {}) {
  return {
    id,
    kind: "class" as const,
    label,
    metadata,
  };
}

function interfaceNode(id: string, label: string, metadata: Record<string, unknown> = {}) {
  return {
    id,
    kind: "interface" as const,
    label,
    metadata,
  };
}

describe("class/no-circular-inheritance", () => {
  test("accepts acyclic inheritance chain", () => {
    const doc = diagram({
      nodes: [classNode("a", "Animal"), classNode("d", "Dog"), classNode("c", "Cat")],
      edges: [
        { id: "e1", kind: "extends", sourceId: "d", targetId: "a", label: "extends" },
        { id: "e2", kind: "extends", sourceId: "c", targetId: "a", label: "extends" },
      ],
    });
    expect(diagnosticsFor(noCircularInheritanceRule, { diagram: doc })).toHaveLength(0);
  });

  test("reports direct circular inheritance (A -> B -> A)", () => {
    const doc = diagram({
      nodes: [classNode("a", "A"), classNode("b", "B")],
      edges: [
        { id: "e1", kind: "extends", sourceId: "a", targetId: "b" },
        { id: "e2", kind: "extends", sourceId: "b", targetId: "a" },
      ],
    });
    const diags = diagnosticsFor(noCircularInheritanceRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.code).toBe("class/no-circular-inheritance");
    expect(diags[0]?.message).toContain("A -> B -> A");
  });

  test("reports indirect circular inheritance (A -> B -> C -> A)", () => {
    const doc = diagram({
      nodes: [classNode("a", "A"), classNode("b", "B"), classNode("c", "C")],
      edges: [
        { id: "e1", kind: "extends", sourceId: "a", targetId: "b" },
        { id: "e2", kind: "extends", sourceId: "b", targetId: "c" },
        { id: "e3", kind: "extends", sourceId: "c", targetId: "a" },
      ],
    });
    const diags = diagnosticsFor(noCircularInheritanceRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("A -> B -> C -> A");
  });

  test("accepts class with no inheritance", () => {
    const doc = diagram({
      nodes: [classNode("a", "Standalone")],
      edges: [],
    });
    expect(diagnosticsFor(noCircularInheritanceRule, { diagram: doc })).toHaveLength(0);
  });
});

describe("class/no-duplicate-member", () => {
  test("accepts class with unique member names", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          fields: [{ name: "id", type: "string", id: "f1" }],
          methods: [{ name: "run", id: "m1" }],
        }),
      ],
    });
    expect(diagnosticsFor(noDuplicateMemberRule, { diagram: doc })).toHaveLength(0);
  });

  test("reports duplicate field names", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          fields: [
            { name: "id", type: "string", id: "f1" },
            { name: "id", type: "number", id: "f2" },
          ],
        }),
      ],
    });
    expect(diagnosticsFor(noDuplicateMemberRule, { diagram: doc })).toHaveLength(1);
  });

  test("reports duplicate method names", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          methods: [
            { name: "run", id: "m1" },
            { name: "run", id: "m2" },
          ],
        }),
      ],
    });
    expect(diagnosticsFor(noDuplicateMemberRule, { diagram: doc })).toHaveLength(1);
  });

  test("reports field and method with same name", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          fields: [{ name: "count", type: "number", id: "f1" }],
          methods: [{ name: "count", id: "m1" }],
        }),
      ],
    });
    expect(diagnosticsFor(noDuplicateMemberRule, { diagram: doc })).toHaveLength(1);
  });

  test("skips non-class nodes", () => {
    const doc = diagram({
      nodes: [interfaceNode("a", "IService")],
    });
    expect(diagnosticsFor(noDuplicateMemberRule, { diagram: doc })).toHaveLength(0);
  });
});

describe("class/no-unknown-type-ref", () => {
  test("accepts primitive type references", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          fields: [{ name: "name", type: "string", id: "f1" }],
          methods: [{ name: "init", returnType: "void", id: "m1", parameters: [] }],
        }),
      ],
    });
    expect(diagnosticsFor(noUnknownTypeRefRule, { diagram: doc })).toHaveLength(0);
  });

  test("accepts references to known classes", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          fields: [{ name: "repo", type: "Repository", id: "f1" }],
        }),
        classNode("b", "Repository"),
      ],
    });
    expect(diagnosticsFor(noUnknownTypeRefRule, { diagram: doc })).toHaveLength(0);
  });

  test("reports unknown type in field", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          fields: [{ name: "cache", type: "RedisCache", id: "f1" }],
        }),
      ],
    });
    const diags = diagnosticsFor(noUnknownTypeRefRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("RedisCache");
  });

  test("reports unknown return type", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          methods: [{ name: "build", returnType: "Builder", id: "m1", parameters: [] }],
        }),
      ],
    });
    expect(diagnosticsFor(noUnknownTypeRefRule, { diagram: doc })).toHaveLength(1);
  });

  test("reports unknown parameter type", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          methods: [{ name: "process", id: "m1", parameters: [{ type: "Config" }] }],
        }),
      ],
    });
    expect(diagnosticsFor(noUnknownTypeRefRule, { diagram: doc })).toHaveLength(1);
  });
});

describe("class/require-visibility", () => {
  test("accepts methods with visibility", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          methods: [{ name: "run", visibility: "public", id: "m1" }],
        }),
      ],
    });
    expect(diagnosticsFor(requireVisibilityRule, { diagram: doc })).toHaveLength(0);
  });

  test("reports methods without visibility", () => {
    const doc = diagram({
      nodes: [
        classNode("a", "Service", {
          methods: [{ name: "run", id: "m1" }],
        }),
      ],
    });
    const diags = diagnosticsFor(requireVisibilityRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("run");
  });

  test("reports on interface methods without visibility", () => {
    const doc = diagram({
      nodes: [
        interfaceNode("a", "IService", {
          methods: [{ name: "execute", id: "m1" }],
        }),
      ],
    });
    expect(diagnosticsFor(requireVisibilityRule, { diagram: doc })).toHaveLength(1);
  });

  test("skips enum nodes", () => {
    const doc = diagram({
      nodes: [{ id: "e", kind: "enum", label: "Status" }],
    });
    expect(diagnosticsFor(requireVisibilityRule, { diagram: doc })).toHaveLength(0);
  });
});

describe("diagram/max-nodes", () => {
  test("accepts diagrams within default limit", () => {
    const nodes = Array.from({ length: 100 }, (_, i) => ({
      id: `n${i}`,
      kind: "class",
      label: `Node${i}`,
    }));
    const doc = diagram({ nodes });
    expect(diagnosticsFor(maxNodesRule, { diagram: doc })).toHaveLength(0);
  });

  test("reports diagrams exceeding default limit", () => {
    const nodes = Array.from({ length: 101 }, (_, i) => ({
      id: `n${i}`,
      kind: "class",
      label: `Node${i}`,
    }));
    const doc = diagram({ nodes });
    const diags = diagnosticsFor(maxNodesRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("101");
  });

  test("respects custom max option", () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({
      id: `n${i}`,
      kind: "class",
      label: `Node${i}`,
    }));
    const doc = diagram({ nodes });
    const engine = new RuleEngine([maxNodesRule]);
    const result = engine.validate({
      diagram: doc,
      config: { rules: { "diagram/max-nodes": ["warn", { max: 4 }] } },
    });
    expect(result.diagnostics).toHaveLength(1);
  });

  test("accepts diagrams at exact limit", () => {
    const nodes = Array.from({ length: 100 }, (_, i) => ({
      id: `n${i}`,
      kind: "class",
      label: `Node${i}`,
    }));
    const doc = diagram({ nodes });
    expect(diagnosticsFor(maxNodesRule, { diagram: doc })).toHaveLength(0);
  });
});

describe("diagram/max-edges", () => {
  test("accepts diagrams within default limit", () => {
    const edges = Array.from({ length: 200 }, (_, i) => ({
      id: `e${i}`,
      kind: "uses",
      sourceId: `n${i % 10}`,
      targetId: `n${(i + 1) % 10}`,
    }));
    const doc = diagram({ edges });
    expect(diagnosticsFor(maxEdgesRule, { diagram: doc })).toHaveLength(0);
  });

  test("reports diagrams exceeding default limit", () => {
    const edges = Array.from({ length: 201 }, (_, i) => ({
      id: `e${i}`,
      kind: "uses",
      sourceId: `n${i % 10}`,
      targetId: `n${(i + 1) % 10}`,
    }));
    const doc = diagram({ edges });
    const diags = diagnosticsFor(maxEdgesRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("201");
  });

  test("respects custom max option", () => {
    const edges = Array.from({ length: 5 }, (_, i) => ({
      id: `e${i}`,
      kind: "uses",
      sourceId: "a",
      targetId: "b",
    }));
    const doc = diagram({ edges });
    const engine = new RuleEngine([maxEdgesRule]);
    const result = engine.validate({
      diagram: doc,
      config: { rules: { "diagram/max-edges": ["warn", { max: 4 }] } },
    });
    expect(result.diagnostics).toHaveLength(1);
  });
});

describe("diagram/no-floating-node", () => {
  test("accepts connected nodes", () => {
    const doc = diagram({
      nodes: [
        { id: "a", kind: "class", label: "A" },
        { id: "b", kind: "class", label: "B" },
      ],
      edges: [{ id: "e1", kind: "uses", sourceId: "a", targetId: "b" }],
    });
    expect(diagnosticsFor(noFloatingNodeRule, { diagram: doc })).toHaveLength(0);
  });

  test("reports floating node not connected to any edge", () => {
    const doc = diagram({
      nodes: [
        { id: "a", kind: "class", label: "A" },
        { id: "b", kind: "class", label: "B" },
        { id: "c", kind: "class", label: "C" },
      ],
      edges: [{ id: "e1", kind: "uses", sourceId: "a", targetId: "b" }],
    });
    const diags = diagnosticsFor(noFloatingNodeRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.target).toBe("node:c");
  });

  test("reports disconnected node", () => {
    const doc = diagram({
      nodes: [
        { id: "a", kind: "class", label: "A" },
        { id: "b", kind: "class", label: "B" },
        { id: "c", kind: "class", label: "C" },
      ],
      edges: [{ id: "e1", kind: "uses", sourceId: "a", targetId: "b" }],
    });
    const diags = diagnosticsFor(noFloatingNodeRule, { diagram: doc });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toContain("C");
  });

  test("reports all disconnected nodes", () => {
    const doc = diagram({
      nodes: [
        { id: "a", kind: "class", label: "A" },
        { id: "b", kind: "class", label: "B" },
      ],
      edges: [],
    });
    expect(diagnosticsFor(noFloatingNodeRule, { diagram: doc })).toHaveLength(2);
  });

  test("accepts empty diagram", () => {
    const doc = diagram({ nodes: [], edges: [] });
    expect(diagnosticsFor(noFloatingNodeRule, { diagram: doc })).toHaveLength(0);
  });
});

describe("expanded presets", () => {
  test("recommended preset includes all class rules", () => {
    for (const rule of classRules) {
      expect(recommended.rules?.[rule.name]).toBeDefined();
    }
  });

  test("recommended preset includes all general diagram rules", () => {
    for (const rule of generalDiagramRules) {
      expect(recommended.rules?.[rule.name]).toBeDefined();
    }
  });

  test("recommended rules list has no duplicates", () => {
    const names = recommendedRules.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("recommended rules count includes all rule packs", () => {
    expect(recommendedRules.length).toBe(
      architectureRules.length +
        diagramRules.length +
        classRules.length +
        generalDiagramRules.length
    );
  });
});
