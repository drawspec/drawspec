import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { exportToMermaid } from "../src/mermaid-exporter";

describe("exportToMermaid", () => {
  test("exports an empty graph diagram", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "test",
      kind: "graph",
      nodes: [],
      edges: [],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toBe("graph TD");
  });

  test("exports graph with nodes and labeled edges", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "test",
      kind: "graph",
      nodes: [
        { id: "a", kind: "box", label: "Node A" },
        { id: "b", kind: "box", label: "Node B" },
      ],
      edges: [
        {
          id: "e1",
          kind: "default",
          sourceId: "a",
          targetId: "b",
          label: "connects",
        },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain('a["Node A"]');
    expect(result).toContain('b["Node B"]');
    expect(result).toContain("a -->|connects| b");
    expect(result).toMatch(/^graph TD$/m);
  });

  test("exports sequence diagram with participants and messages", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "seq",
      kind: "sequence",
      nodes: [
        { id: "alice", kind: "actor", label: "Alice" },
        { id: "bob", kind: "actor", label: "Bob" },
      ],
      edges: [
        {
          id: "m1",
          kind: "message",
          sourceId: "alice",
          targetId: "bob",
          label: "Hello",
        },
        {
          id: "m2",
          kind: "return",
          sourceId: "bob",
          targetId: "alice",
          label: "Hi there",
        },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("sequenceDiagram");
    expect(result).toContain("participant alice as Alice");
    expect(result).toContain("participant bob as Bob");
    expect(result).toContain("alice->>bob: Hello");
    expect(result).toContain("bob-->>alice: Hi there");
  });

  test("exports graph with groups", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "grouped",
      kind: "graph",
      nodes: [
        { id: "a", kind: "box", label: "A" },
        { id: "b", kind: "box", label: "B" },
        { id: "c", kind: "box", label: "C" },
      ],
      edges: [
        {
          id: "e1",
          kind: "default",
          sourceId: "a",
          targetId: "b",
        },
      ],
      groups: [
        {
          id: "g1",
          kind: "group",
          label: "My Group",
          childIds: ["b", "c"],
        },
      ],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain('subgraph g1["My Group"]');
    expect(result).toContain('b["B"]');
    expect(result).toContain('c["C"]');
    expect(result).toContain("end");
    expect(result).toContain("a --> b");
  });

  test("exports class diagram", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "cls",
      kind: "class",
      nodes: [
        { id: "animal", kind: "class", label: "Animal" },
        { id: "dog", kind: "class", label: "Dog" },
      ],
      edges: [
        {
          id: "e1",
          kind: "inheritance",
          sourceId: "dog",
          targetId: "animal",
        },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("classDiagram");
    expect(result).toContain("class animal");
    expect(result).toContain("class dog");
    expect(result).toContain("dog --|> animal");
  });

  test("exports state diagram with transitions", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "state",
      kind: "state",
      nodes: [
        { id: "idle", kind: "state", label: "Idle" },
        { id: "running", kind: "state", label: "Running" },
      ],
      edges: [
        {
          id: "e1",
          kind: "transition",
          sourceId: "idle",
          targetId: "running",
          label: "start",
        },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("stateDiagram-v2");
    expect(result).toContain('state "Idle" as idle');
    expect(result).toContain("idle --> running: start");
  });

  test("respects layout direction", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "dir",
      kind: "graph",
      nodes: [{ id: "a", kind: "box" }],
      edges: [],
      groups: [],
      annotations: [],
      layout: { direction: "lr" },
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("graph LR");
  });

  test("escapes quotes in labels", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "esc",
      kind: "graph",
      nodes: [{ id: "a", kind: "box", label: 'Say "hello"' }],
      edges: [],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("Say #quot;hello#quot;");
  });
});
