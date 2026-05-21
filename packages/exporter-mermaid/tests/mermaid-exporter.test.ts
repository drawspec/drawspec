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

  test("emits basic parseable graph syntax", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "syntax",
      kind: "graph",
      nodes: [
        { id: "start", kind: "box", label: "Start" },
        { id: "end", kind: "box", label: "End" },
      ],
      edges: [{ id: "e1", kind: "default", sourceId: "start", targetId: "end", label: "go" }],
      groups: [{ id: "g", kind: "group", label: "Group", childIds: ["end"] }],
      annotations: [],
    };

    const result = exportToMermaid(doc);
    const lines = result.split("\n");

    expect(lines[0]).toBe("graph TD");
    expect(result).toMatch(/^ {2}subgraph g\["Group"\]$/m);
    expect(result).toMatch(/^ {2}end$/m);
    expect(result).toMatch(/^ {2}start -->\|go\| end$/m);
  });

  test("escapes Mermaid label delimiters", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "pipe",
      kind: "graph",
      nodes: [{ id: "a", kind: "box", label: "A|B" }],
      edges: [{ id: "e1", kind: "default", sourceId: "a", targetId: "a", label: "x|y" }],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain('a["A&#124;B"]');
    expect(result).toContain("a -->|x&#124;y| a");
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

    expect(result).toContain("Say &quot;hello&quot;");
  });

  test("sanitizes empty IDs to a stable fallback", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "empty-id",
      kind: "graph",
      nodes: [{ id: "", kind: "box", label: "empty" }],
      edges: [],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain('id_["empty"]');
  });

  test("edge direction controls arrow direction", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "dir-test",
      kind: "graph",
      nodes: [
        { id: "a", kind: "box" },
        { id: "b", kind: "box" },
        { id: "c", kind: "box" },
        { id: "d", kind: "box" },
      ],
      edges: [
        { id: "e1", kind: "default", sourceId: "a", targetId: "b", direction: "backward" },
        { id: "e2", kind: "default", sourceId: "b", targetId: "c", direction: "bidirectional" },
        { id: "e3", kind: "default", sourceId: "c", targetId: "d", direction: "none" },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("b --> a");
    expect(result).toContain("b <--> c");
    expect(result).toContain("c --- d");
  });

  test("backward edge direction reverses dashed endpoints", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "dash-backward",
      kind: "graph",
      nodes: [
        { id: "a", kind: "box" },
        { id: "b", kind: "box" },
      ],
      edges: [
        { id: "e1", kind: "dependency", sourceId: "a", targetId: "b", direction: "backward" },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("b -.-> a");
  });

  test("edge direction works with dashed style", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "dash-dir",
      kind: "graph",
      nodes: [
        { id: "a", kind: "box" },
        { id: "b", kind: "box" },
      ],
      edges: [{ id: "e1", kind: "dashed", sourceId: "a", targetId: "b", direction: "none" }],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("a -.- b");
  });

  test("class diagram supports extends and implements kinds", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "cls",
      kind: "class",
      nodes: [
        { id: "animal", kind: "class", label: "Animal" },
        { id: "dog", kind: "class", label: "Dog" },
        { id: "pet", kind: "class", label: "Pet" },
      ],
      edges: [
        { id: "e1", kind: "extends", sourceId: "dog", targetId: "animal" },
        { id: "e2", kind: "implements", sourceId: "dog", targetId: "pet" },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("dog --|> animal");
    expect(result).toContain("dog ..|> pet");
  });

  test("ID sanitization avoids collisions", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "collision",
      kind: "graph",
      nodes: [
        { id: "a-b", kind: "box", label: "A-B" },
        { id: "a_b", kind: "box", label: "A_B" },
      ],
      edges: [{ id: "e1", kind: "default", sourceId: "a-b", targetId: "a_b" }],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain('a_b["A-B"]');
    expect(result).toContain('a_b_1["A_B"]');
    expect(result).toMatch(/a_b .+ a_b_1/);
  });

  test("escapes pipe characters in edge labels", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "pipe",
      kind: "graph",
      nodes: [
        { id: "a", kind: "box" },
        { id: "b", kind: "box" },
      ],
      edges: [
        {
          id: "e1",
          kind: "default",
          sourceId: "a",
          targetId: "b",
          label: "left|right",
        },
      ],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("&#124;");
    const edgeLine = result.split("\n").find((l) => l.includes("left"));
    const innerLabel = edgeLine?.match(/\|(.+)\|/)?.[1] ?? "";
    expect(innerLabel).not.toContain("|");
  });

  test("sanitizeId handles all-non-alphanumeric IDs", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "dash",
      kind: "graph",
      nodes: [{ id: "-", kind: "box", label: "Dash" }],
      edges: [],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("_[");

    const doc2: DiagramDocument = {
      schemaVersion: "1",
      id: "multi",
      kind: "graph",
      nodes: [
        { id: "-", kind: "box", label: "Dash" },
        { id: "--", kind: "box", label: "Dash2" },
      ],
      edges: [],
      groups: [],
      annotations: [],
    };

    const result2 = exportToMermaid(doc2);
    const idPattern = /_.*\[.*Dash.*\]/g;
    const matches = result2.match(idPattern);
    expect(matches).toHaveLength(2);
    expect(matches?.[0]).not.toBe(matches?.[1]);
  });

  test("emits unsupported feature comments", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "unsupported",
      kind: "graph",
      nodes: [{ id: "a", kind: "box", metadata: { owner: "team" }, style: { id: "primary" } }],
      edges: [],
      groups: [{ id: "g", kind: "group", description: "Dropped", childIds: [] }],
      annotations: [{ id: "note", kind: "note", label: "Dropped" }],
      styles: { tokens: { color: "red" } },
      metadata: { generatedBy: "test" },
    };

    const result = exportToMermaid(doc);

    expect(result).toContain("%% drawspec: unsupported - annotations");
    expect(result).toContain("%% drawspec: unsupported - styles");
    expect(result).toContain("%% drawspec: unsupported - metadata");
    expect(result).toContain("%% drawspec: unsupported - group descriptions");
  });

  test("output passes basic Mermaid syntax checks", () => {
    const doc: DiagramDocument = {
      schemaVersion: "1",
      id: "syntax",
      kind: "graph",
      nodes: [
        { id: "a", kind: "box", label: "A" },
        { id: "b", kind: "box", label: "B" },
      ],
      edges: [{ id: "e1", kind: "default", sourceId: "a", targetId: "b", label: "link" }],
      groups: [],
      annotations: [],
    };

    const result = exportToMermaid(doc);

    expect(result).toMatch(/^graph (TD|BT|LR|RL)$/m);
    expect(result).toMatch(/a\[.*\]/);
    expect(result).toMatch(/b\[.*\]/);
    expect(result).not.toMatch(/\[\s*\]/);
    expect(result).not.toMatch(/\|\s*\|/);
  });
});
