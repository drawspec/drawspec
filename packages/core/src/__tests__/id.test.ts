import { describe, expect, test } from "bun:test";
import { createDeterministicId, DiagnosticCode, IdRegistry } from "../index";

describe("deterministic IDs", () => {
  test("same input produces the same ID across 100 iterations", () => {
    const input = { kind: "node", label: "API", metadata: { version: 1 } };
    const first = createDeterministicId(input);

    for (let index = 0; index < 100; index += 1) {
      expect(createDeterministicId(input)).toBe(first);
    }
  });

  test("object key order does not affect generated IDs", () => {
    const left = createDeterministicId({ b: 2, a: 1, nested: { y: true, x: false } });
    const right = createDeterministicId({ nested: { x: false, y: true }, a: 1, b: 2 });

    expect(left).toBe(right);
  });

  test("different inputs produce different IDs", () => {
    const first = createDeterministicId({ kind: "node", label: "API" });
    const second = createDeterministicId({ kind: "node", label: "Database" });

    expect(first).not.toBe(second);
  });

  test("supports deterministic prefixes and lengths", () => {
    const id = createDeterministicId("api", { prefix: "node", length: 8 });

    expect(id).toMatch(/^node_[0-9a-f]{8}$/);
  });

  test("ID registry accepts first registration", () => {
    const registry = new IdRegistry();

    expect(registry.registerId("node_a")).toBeNull();
    expect(registry.has("node_a")).toBe(true);
  });

  test("ID registry reports collisions as diagnostics", () => {
    const registry = new IdRegistry();
    registry.registerId("node_a");

    const collision = registry.registerId("node_a");

    expect(collision?.code).toBe(DiagnosticCode.IdCollision);
    expect(collision?.severity).toBe("error");
    expect(collision?.target).toBe("node_a");
  });

  test("ID registry can be cleared", () => {
    const registry = new IdRegistry();
    registry.registerId("node_a");
    registry.clear();

    expect(registry.has("node_a")).toBe(false);
    expect(registry.registerId("node_a")).toBeNull();
  });
});
