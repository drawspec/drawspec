import { describe, expect, test } from "bun:test";
import type { DiagramNode, IconSpec } from "@drawspec/core";
import { normalizeNodeVisuals } from "../normalize";

describe("normalizeNodeVisuals", () => {
  test("derives default icons from node kind", () => {
    const node: DiagramNode = { id: "user", kind: "person", label: "User" };
    expect(normalizeNodeVisuals(node).icons).toEqual([
      { type: "builtin", name: "person", placement: "top", size: { width: 24, height: 30 } },
    ]);
  });

  test("derives default shapes from node kind", () => {
    expect(normalizeNodeVisuals({ id: "db", kind: "database" }).shape).toEqual({
      type: "cylinder",
      curve: 18,
    });
    expect(normalizeNodeVisuals({ id: "component", kind: "component" }).shape).toEqual({
      type: "tabbed-rect",
    });
  });

  test("derives UML and flowchart shapes from node kind", () => {
    expect(normalizeNodeVisuals({ id: "decision", kind: "decision" }).shape).toEqual({
      type: "diamond",
    });
    expect(normalizeNodeVisuals({ id: "choice", kind: "choice" }).shape).toEqual({
      type: "diamond",
    });
    expect(normalizeNodeVisuals({ id: "initial", kind: "initial" }).shape).toEqual({
      type: "circle",
    });
    expect(normalizeNodeVisuals({ id: "final", kind: "final" }).shape).toEqual({
      type: "bullseye",
    });
    expect(normalizeNodeVisuals({ id: "fork", kind: "fork" }).shape).toEqual({
      type: "sync-bar",
    });
    expect(normalizeNodeVisuals({ id: "join", kind: "join" }).shape).toEqual({
      type: "sync-bar",
    });
    expect(normalizeNodeVisuals({ id: "use-case", kind: "use-case" }).shape).toEqual({
      type: "ellipse",
    });
    expect(normalizeNodeVisuals({ id: "artifact", kind: "artifact" }).shape).toEqual({
      type: "document",
    });
    expect(normalizeNodeVisuals({ id: "note", kind: "note" }).shape).toEqual({ type: "note" });
  });

  test("explicit icons override kind defaults", () => {
    const icons: IconSpec[] = [{ type: "builtin", name: "cloud", placement: "left" }];
    const node: DiagramNode = { id: "user", kind: "person", icons };
    expect(normalizeNodeVisuals(node).icons).toBe(icons);
  });

  test("empty explicit icons opt out of kind defaults", () => {
    const node: DiagramNode = { id: "actor", kind: "actor", icons: [] };
    expect(normalizeNodeVisuals(node).icons).toEqual([]);
  });

  test("explicit shape overrides kind defaults", () => {
    const node: DiagramNode = { id: "db", kind: "database", shape: { type: "rect" } };
    expect(normalizeNodeVisuals(node).shape).toEqual({ type: "rect" });
  });
});
