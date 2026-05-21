import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { exportToPlantUML } from "../plantuml-exporter";

function makeDoc(
  overrides: Partial<DiagramDocument> & Pick<DiagramDocument, "id" | "kind">
): DiagramDocument {
  return {
    schemaVersion: "1.0.0",
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    ...overrides,
  };
}

describe("exportToPlantUML", () => {
  test("wraps output in @startuml/@enduml", () => {
    const doc = makeDoc({ id: "test", kind: "graph" });
    const out = exportToPlantUML(doc);
    expect(out.startsWith("@startuml\n")).toBe(true);
    expect(out.trimEnd().endsWith("@enduml")).toBe(true);
  });

  test("includes title when present", () => {
    const doc = makeDoc({ id: "test", kind: "graph", title: "My Diagram" });
    const out = exportToPlantUML(doc);
    expect(out).toContain("title My Diagram");
  });

  test("exports sequence diagram with participants and messages", () => {
    const doc = makeDoc({
      id: "seq1",
      kind: "sequence",
      nodes: [
        { id: "alice", kind: "participant", label: "Alice" },
        { id: "bob", kind: "participant", label: "Bob" },
      ],
      edges: [
        { id: "e1", kind: "message", sourceId: "alice", targetId: "bob", label: "Hello" },
        { id: "e2", kind: "message", sourceId: "bob", targetId: "alice", label: "Hi" },
      ],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('participant "Alice" as alice');
    expect(out).toContain('participant "Bob" as bob');
    expect(out).toContain("alice -> bob : Hello");
    expect(out).toContain("bob -> alice : Hi");
  });

  test("exports class diagram with extends relationship (correct direction)", () => {
    const doc = makeDoc({
      id: "cls1",
      kind: "class",
      nodes: [
        { id: "animal", kind: "class", label: "Animal" },
        { id: "dog", kind: "class", label: "Dog" },
      ],
      edges: [{ id: "e1", kind: "extends", sourceId: "dog", targetId: "animal" }],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('class "Animal"');
    expect(out).toContain('class "Dog"');
    expect(out).toContain('"Animal" <|-- "Dog"');
  });

  test("exports class diagram with implements relationship (correct direction)", () => {
    const doc = makeDoc({
      id: "cls2",
      kind: "class",
      nodes: [
        { id: "iface", kind: "interface", label: "Runnable" },
        { id: "impl", kind: "class", label: "MyTask" },
      ],
      edges: [{ id: "e1", kind: "implements", sourceId: "impl", targetId: "iface" }],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('"Runnable" <|.. "MyTask"');
  });

  test("exports state diagram with alias-based transitions", () => {
    const doc = makeDoc({
      id: "st1",
      kind: "state",
      nodes: [
        { id: "idle", kind: "state", label: "Idle" },
        { id: "running", kind: "state", label: "Running" },
      ],
      edges: [
        { id: "e1", kind: "transition", sourceId: "idle", targetId: "running", label: "start" },
      ],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('state "Idle" as idle');
    expect(out).toContain('state "Running" as running');
    expect(out).toContain("idle --> running : start");
  });

  test("exports state diagram with start/end pseudo-states as [*]", () => {
    const doc = makeDoc({
      id: "st2",
      kind: "state",
      nodes: [
        { id: "s0", kind: "start", label: "Start" },
        { id: "idle", kind: "state", label: "Idle" },
        { id: "done", kind: "end", label: "Done" },
      ],
      edges: [
        { id: "e1", kind: "transition", sourceId: "s0", targetId: "idle" },
        { id: "e2", kind: "transition", sourceId: "idle", targetId: "done" },
      ],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain("[*] --> idle");
    expect(out).toContain("idle --> [*]");
    expect(out).not.toContain('state "Start"');
    expect(out).not.toContain('state "Done"');
  });

  test("exports state diagram with composite state groups", () => {
    const doc = makeDoc({
      id: "st3",
      kind: "state",
      nodes: [
        { id: "outer", kind: "state", label: "Active" },
        { id: "inner1", kind: "state", label: "Working" },
        { id: "inner2", kind: "state", label: "Resting" },
      ],
      edges: [
        { id: "e1", kind: "transition", sourceId: "inner1", targetId: "inner2", label: "pause" },
      ],
      groups: [{ id: "g1", kind: "composite", label: "Active", childIds: ["inner1", "inner2"] }],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('state "Active" {');
    expect(out).toContain('  state "Working" as inner1');
    expect(out).toContain('  state "Resting" as inner2');
    expect(out).toContain("inner1 --> inner2 : pause");
  });

  test("exports activity diagram with actions", () => {
    const doc = makeDoc({
      id: "act1",
      kind: "activity",
      nodes: [
        { id: "n1", kind: "activity", label: "Initialize" },
        { id: "n2", kind: "activity", label: "Process" },
      ],
      edges: [],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain("start");
    expect(out).toContain(":Initialize;");
    expect(out).toContain(":Process;");
    expect(out).toContain("stop");
  });

  test("does not emit start/stop for empty activity diagram", () => {
    const doc = makeDoc({ id: "act-empty", kind: "activity", nodes: [], edges: [] });
    const out = exportToPlantUML(doc);
    expect(out).not.toContain("\nstart\n");
    expect(out).not.toContain("\nstop\n");
  });

  test("exports activity diagram with if/branch group and else clause", () => {
    const doc = makeDoc({
      id: "act2",
      kind: "activity",
      nodes: [
        { id: "n1", kind: "activity", label: "Check" },
        { id: "n2", kind: "activity", label: "Yes Action" },
      ],
      edges: [],
      groups: [
        {
          id: "g1",
          kind: "if",
          label: "condition",
          childIds: ["n2"],
        },
      ],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain("if (condition) then (yes)");
    expect(out).toContain(":Yes Action;");
    expect(out).toContain("else (no)");
    expect(out).toContain("endif");
  });

  test("activity diagram orders nodes by declared sequence", () => {
    const doc = makeDoc({
      id: "act3",
      kind: "activity",
      nodes: [
        { id: "n1", kind: "activity", label: "First" },
        { id: "n2", kind: "activity", label: "BranchAction" },
        { id: "n3", kind: "activity", label: "Last" },
      ],
      edges: [],
      groups: [{ id: "g1", kind: "if", label: "cond", childIds: ["n2"] }],
    });
    const out = exportToPlantUML(doc);
    const firstIdx = out.indexOf(":First;");
    const branchIdx = out.indexOf("if (cond)");
    const lastIdx = out.indexOf(":Last;");
    expect(firstIdx).toBeLessThan(branchIdx);
    expect(branchIdx).toBeLessThan(lastIdx);
  });

  test("exports component diagram with interfaces", () => {
    const doc = makeDoc({
      id: "comp1",
      kind: "component",
      nodes: [
        { id: "web", kind: "component", label: "Web App" },
        { id: "api", kind: "interface", label: "REST API" },
        { id: "db", kind: "database", label: "Database" },
      ],
      edges: [
        { id: "e1", kind: "uses", sourceId: "web", targetId: "api" },
        { id: "e2", kind: "uses", sourceId: "api", targetId: "db" },
      ],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('component "Web App"');
    expect(out).toContain('interface "REST API"');
    expect(out).toContain('database "Database"');
    expect(out).toContain("..>");
  });

  test("exports generic fallback for unknown kinds", () => {
    const doc = makeDoc({
      id: "g1",
      kind: "graph",
      nodes: [{ id: "a", kind: "node", label: "A" }],
      edges: [{ id: "e1", kind: "link", sourceId: "a", targetId: "b" }],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('rectangle "A"');
    expect(out).toContain("->");
  });

  test("escapes double quotes in labels", () => {
    const doc = makeDoc({
      id: "esc1",
      kind: "class",
      nodes: [{ id: "c1", kind: "class", label: 'My "Class"' }],
      edges: [],
    });
    const out = exportToPlantUML(doc);
    expect(out).toContain('My \\"Class\\"');
  });
});
