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
    expect(out).toContain("participant");
    expect(out).toContain("alice -> bob : Hello");
    expect(out).toContain("bob -> alice : Hi");
  });

  test("exports class diagram with relationships", () => {
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
    expect(out).toContain("<|--");
  });

  test("exports state diagram with transitions", () => {
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
    expect(out).toContain('state "Idle"');
    expect(out).toContain("Idle --> Running : start");
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
