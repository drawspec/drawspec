import { describe, expect, test } from "bun:test";
import type {
  DiagramAnnotation,
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramKind,
  DiagramNode,
  SourceRef,
} from "../index";
import { createDiagnostic, DiagnosticCode } from "../index";

describe("IR type construction", () => {
  test("constructs all diagram kinds", () => {
    const kinds: DiagramKind[] = [
      "architecture",
      "sequence",
      "class",
      "component",
      "deployment",
      "state",
      "activity",
      "use-case",
      "object",
      "timing",
      "er",
      "graph",
    ];

    expect(kinds).toHaveLength(12);
  });

  test("constructs node, edge, group, and annotation interfaces", () => {
    const source: SourceRef = { file: "diagram.ts", line: 10, column: 5, symbol: "System" };
    const node: DiagramNode = {
      id: "node_a",
      kind: "component",
      label: "API",
      description: "Public API",
      tags: ["edge"],
      metadata: { owner: "platform" },
      style: { id: "primary" },
      source,
    };
    const edge: DiagramEdge = {
      id: "edge_a_b",
      kind: "calls",
      sourceId: "node_a",
      targetId: "node_b",
      direction: "forward",
      tags: ["sync"],
      metadata: { protocol: "https" },
      source,
    };
    const group: DiagramGroup = {
      id: "group_platform",
      kind: "boundary",
      label: "Platform",
      childIds: [node.id],
      source,
    };
    const annotation: DiagramAnnotation = {
      id: "annotation_note",
      kind: "note",
      label: "SLO",
      targetId: node.id,
      metadata: { text: "99.9%" },
      source,
    };

    expect(node.source?.file).toBe("diagram.ts");
    expect(edge.sourceId).toBe(node.id);
    expect(group.childIds).toEqual([node.id]);
    expect(annotation.targetId).toBe(node.id);
  });

  test("constructs diagram document interface", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1.0.0",
      id: "doc_system",
      title: "System",
      kind: "architecture",
      nodes: [{ id: "node_a", kind: "system", label: "System" }],
      edges: [],
      groups: [],
      annotations: [],
      layout: { engine: "dagre", direction: "lr" },
      styles: { tokens: { color: "#000" }, rules: { system: { stroke: 2 } } },
      metadata: { environment: "prod" },
      diagnostics: [],
    };

    expect(doc.kind).toBe("architecture");
    expect(doc.nodes[0]?.label).toBe("System");
  });

  test("constructs diagnostics with hint severity and source target", () => {
    const diagnostic = createDiagnostic({
      code: DiagnosticCode.InvalidReference,
      severity: "hint",
      message: "Reference can be simplified",
      source: { file: "diagram.ts", line: 2, column: 1 },
      target: "node_a",
      help: "Remove unused relationship.",
    });

    expect(diagnostic.severity).toBe("hint");
    expect(diagnostic.target).toBe("node_a");
  });
});
