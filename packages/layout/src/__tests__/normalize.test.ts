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
      type: "rounded-rect",
      radius: 3,
    });
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
