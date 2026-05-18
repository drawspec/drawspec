import { describe, expect, test } from "bun:test";
import type { DiagramEdge, DiagramNode, Direction, SourceRef, StyleRef } from "../index";
import {
  createBuilder,
  createBuilderFactory,
  createRelationshipBuilder,
  IdRegistry,
} from "../index";

interface ServiceNode extends DiagramNode {
  kind: "service";
}

interface CallsEdge extends DiagramEdge {
  kind: "calls";
}

describe("builder primitives", () => {
  test("ElementBuilder produces a valid DiagramNode with all fields", () => {
    const source: SourceRef = { file: "diagram.ts", line: 1, column: 2, symbol: "Api" };
    const style: StyleRef = { id: "primary", variant: "solid" };

    const node = createBuilder<ServiceNode>("service", { parentId: "group_platform" })
      .id("node_api")
      .label("API")
      .description("Public API")
      .tag("external", "critical")
      .metadata({ owner: "platform" })
      .metadata({ tier: 1 })
      .style(style)
      .source(source)
      .build();

    expect(node).toEqual({
      id: "node_api",
      kind: "service",
      label: "API",
      description: "Public API",
      parentId: "group_platform",
      tags: ["critical", "external"],
      metadata: { owner: "platform", tier: 1 },
      style,
      source,
    });
  });

  test("ElementBuilder chainable methods return the same builder", () => {
    const builder = createBuilder("database");

    expect(builder.label("Database")).toBe(builder);
    expect(builder.description("Stores data")).toBe(builder);
    expect(builder.tag("stateful")).toBe(builder);
    expect(builder.metadata({ engine: "postgres" })).toBe(builder);
    expect(builder.style({ id: "data" })).toBe(builder);
    expect(builder.source({ file: "diagram.ts", line: 3, column: 4 })).toBe(builder);
  });

  test("RelationshipBuilder produces a valid DiagramEdge", () => {
    const direction: Direction = "forward";
    const edge = createRelationshipBuilder<CallsEdge>("calls")
      .id("edge_api_db")
      .from("node_api")
      .to("node_db")
      .label("queries")
      .direction(direction)
      .tag("sync")
      .metadata({ protocol: "sql" })
      .style({ id: "dashed" })
      .build();

    expect(edge.kind).toBe("calls");
    expect(edge.id).toBe("edge_api_db");
    expect(edge.sourceId).toBe("node_api");
    expect(edge.targetId).toBe("node_db");
    expect(edge.label).toBe("queries");
    expect(edge.direction).toBe("forward");
    expect(edge.tags).toEqual(["sync"]);
    expect(edge.metadata).toEqual({ protocol: "sql" });
    expect(edge.style).toEqual({ id: "dashed" });
  });

  test("RelationshipBuilder without .id() generates deterministic ID", () => {
    const first = createRelationshipBuilder("calls")
      .from("node_api")
      .to("node_db")
      .label("queries")
      .build();
    const second = createRelationshipBuilder("calls")
      .from("node_api")
      .to("node_db")
      .label("queries")
      .build();

    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^edge_[0-9a-f]{16}$/);
  });

  test("RelationshipBuilder.id() sets explicit ID", () => {
    const first = createRelationshipBuilder("calls")
      .id("edge_explicit")
      .from("node_api")
      .to("node_db")
      .build();
    const second = createRelationshipBuilder("calls")
      .id("edge_explicit")
      .from("node_api")
      .to("node_db")
      .build();

    expect(first.id).toBe("edge_explicit");
    expect(second.id).toBe("edge_explicit");
    expect(first.id).toBe(second.id);
  });

  test("RelationshipBuilder.id() chainable method returns the same builder", () => {
    const builder = createRelationshipBuilder("calls");

    expect(builder.id("edge_test")).toBe(builder);
  });

  test("RelationshipBuilder requires source and target before build", () => {
    expect(() => createRelationshipBuilder("calls").to("node_db").build()).toThrow(
      "Relationship source is required."
    );
    expect(() => createRelationshipBuilder("calls").from("node_api").build()).toThrow(
      "Relationship target is required."
    );
  });

  test("builder factory shares an ID registry for collision detection", () => {
    const factory = createBuilderFactory();

    factory.element("service").id("node_api").build();

    expect(() => factory.element("service").id("node_api").build()).toThrow(
      "Duplicate diagram element ID: node_api"
    );
    expect(factory.idRegistry.has("node_api")).toBe(true);
  });

  test("deterministic node IDs are stable without explicit IDs", () => {
    const first = createBuilder("service").label("API").tag("public", "critical").build();
    const second = createBuilder("service").label("API").tag("critical", "public").build();

    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^node_[0-9a-f]{16}$/);
  });

  test("deterministic edge IDs are stable without explicit IDs", () => {
    const first = createRelationshipBuilder("calls")
      .from("node_api")
      .to("node_db")
      .label("queries")
      .build();
    const second = createRelationshipBuilder("calls")
      .from("node_api")
      .to("node_db")
      .label("queries")
      .build();

    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^edge_[0-9a-f]{16}$/);
  });

  test("explicit IdRegistry detects deterministic ID collisions", () => {
    const registry = new IdRegistry();
    const buildApi = () => createBuilder("service", { idRegistry: registry }).label("API").build();

    buildApi();

    expect(buildApi).toThrow("Duplicate diagram element ID:");
  });
});
