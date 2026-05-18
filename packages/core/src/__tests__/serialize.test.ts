import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "../index";
import { serializeDocument, stableStringify, stableValue } from "../index";

function makeDocument(): DiagramDocument {
  return {
    schemaVersion: "1.0.0",
    id: "doc_system",
    title: "System",
    kind: "architecture",
    nodes: [
      {
        id: "node_b",
        kind: "database",
        label: "Database",
        metadata: { z: 3, a: 1 },
      },
      {
        id: "node_a",
        kind: "service",
        label: "API",
      },
    ],
    edges: [
      {
        id: "edge_a_b",
        kind: "calls",
        sourceId: "node_a",
        targetId: "node_b",
        direction: "forward",
      },
    ],
    groups: [],
    annotations: [],
    metadata: { owner: "platform", priority: 1 },
  };
}

describe("stable serialization", () => {
  test("serializes a document identically across repeated calls", () => {
    const doc = makeDocument();

    expect(serializeDocument(doc)).toBe(serializeDocument(doc));
  });

  test("sorts object keys alphabetically at every level", () => {
    const serialized = stableStringify({ z: 1, a: { y: 2, b: 3 } });

    expect(serialized).toBe('{"a":{"b":3,"y":2},"z":1}');
  });

  test("normalizes undefined object fields by omitting them", () => {
    const serialized = stableStringify({ a: 1, b: undefined });

    expect(serialized).toBe('{"a":1}');
  });

  test("normalizes undefined array entries to null", () => {
    const stable = stableValue(["a", undefined, "b"]);

    expect(stable).toEqual(["a", null, "b"]);
  });

  test("normalizes non-finite numbers to null", () => {
    expect(stableStringify({ value: Number.NaN })).toBe('{"value":null}');
    expect(stableStringify({ value: Number.POSITIVE_INFINITY })).toBe('{"value":null}');
  });

  test("normalizes top-level undefined to null string", () => {
    expect(stableStringify(undefined)).toBe("null");
  });

  test("documents with equivalent object key order serialize identically", () => {
    const first = makeDocument();
    const second: DiagramDocument = {
      ...makeDocument(),
      metadata: { priority: 1, owner: "platform" },
    };

    expect(serializeDocument(first)).toBe(serializeDocument(second));
  });
});
