import { describe, expect, it } from "bun:test";
import { sizeEdgeLabels } from "../edge-labels";
import type { LabelLine, Point, PositionedEdge } from "../types";

/** Helper to create a minimal positioned edge with required fields. */
function makeEdge(overrides: Partial<PositionedEdge> & { waypoints: Point[] }): PositionedEdge {
  return {
    id: overrides.id ?? "edge-1",
    source: overrides.source ?? "node-1",
    target: overrides.target ?? "node-2",
    waypoints: overrides.waypoints,
    labelPosition: overrides.labelPosition ?? { x: 0, y: 0 },
    labelLines: overrides.labelLines ?? [],
    ...overrides,
  };
}

describe("sizeEdgeLabels", () => {
  it("computes label position at midpoint of straight edge", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        label: "Hello",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelPosition).toEqual({ x: 50, y: 0 });
    expect(edges[0]!.labelLines).toEqual(["Hello"]);
  });

  it("skips edges without a label", () => {
    const originalPosition = { x: 10, y: 20 };
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        labelPosition: originalPosition,
      }),
    ];

    sizeEdgeLabels(edges);

    // Should not mutate edges without labels
    expect(edges[0]!.labelPosition).toEqual(originalPosition);
    expect(edges[0]!.labelLines).toEqual([]);
  });

  it("handles empty waypoints array", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [],
        label: "test",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelPosition).toEqual({ x: 0, y: 0 });
    expect(edges[0]!.labelLines).toEqual(["test"]);
  });

  it("handles single waypoint", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [{ x: 50, y: 50 }],
        label: "single",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelPosition).toEqual({ x: 50, y: 50 });
    expect(edges[0]!.labelLines).toEqual(["single"]);
  });

  it("computes midpoint for multi-segment edge", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
        label: "multi",
      }),
    ];

    sizeEdgeLabels(edges);

    // Total path length = 100 + 100 = 200, midpoint at 100
    // First segment is 100 long, so midpoint is at end of first segment: (100, 0)
    expect(edges[0]!.labelPosition).toEqual({ x: 100, y: 0 });
    expect(edges[0]!.labelLines).toEqual(["multi"]);
  });

  it("computes midpoint for asymmetric multi-segment edge", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 100 },
        ],
        label: "asym",
      }),
    ];

    sizeEdgeLabels(edges);

    // Total path = 200 + 100 = 300, midpoint at 150
    // First segment is 200, midpoint 150 is at t=0.75 along first segment
    // x = 0 + 0.75 * 200 = 150, y = 0
    expect(edges[0]!.labelPosition).toEqual({ x: 150, y: 0 });
    expect(edges[0]!.labelLines).toEqual(["asym"]);
  });

  it("wraps long labels to maxWidth", () => {
    const longLabel = "This is a very long edge label that should be wrapped";
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        label: longLabel,
      }),
    ];

    sizeEdgeLabels(edges, { fontSize: 14 });

    // Should produce multiple lines for a long label
    expect(edges[0]!.labelLines.length).toBeGreaterThan(1);
  });

  it("preserves multi-line labels (with \\n)", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
        ],
        label: "Line 1\nLine 2",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelLines).toEqual(["Line 1", "Line 2"]);
  });

  it("produces empty labelLines for empty string label", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        label: "",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelLines).toEqual([]);
  });

  it("handles self-loop edge waypoints", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        source: "node-1",
        target: "node-1",
        waypoints: [
          { x: 100, y: 50 },
          { x: 128, y: 36 },
          { x: 128, y: 22 },
          { x: 60, y: 22 },
          { x: 60, y: 36 },
          { x: 60, y: 50 },
        ],
        label: "self",
      }),
    ];

    sizeEdgeLabels(edges);

    // Should compute a valid midpoint on the loop path
    const pos = edges[0]!.labelPosition;
    expect(typeof pos.x).toBe("number");
    expect(typeof pos.y).toBe("number");
    expect(edges[0]!.labelLines).toEqual(["self"]);
  });

  it("is deterministic — same input produces same output", () => {
    const createEdges = (): PositionedEdge[] => [
      makeEdge({
        waypoints: [
          { x: 10, y: 20 },
          { x: 110, y: 70 },
        ],
        label: "deterministic",
      }),
    ];

    const edges1 = createEdges();
    const edges2 = createEdges();

    sizeEdgeLabels(edges1);
    sizeEdgeLabels(edges2);

    expect(edges1[0]!.labelPosition).toEqual(edges2[0]!.labelPosition);
    expect(edges1[0]!.labelLines).toEqual(edges2[0]!.labelLines);
  });

  it("handles diagonal edge correctly", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        label: "diagonal",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelPosition).toEqual({ x: 50, y: 50 });
    expect(edges[0]!.labelLines).toEqual(["diagonal"]);
  });

  it("handles multiple edges independently", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        id: "edge-1",
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        label: "first",
      }),
      makeEdge({
        id: "edge-2",
        waypoints: [
          { x: 0, y: 50 },
          { x: 200, y: 50 },
        ],
        label: "second",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelPosition).toEqual({ x: 50, y: 0 });
    expect(edges[0]!.labelLines).toEqual(["first"]);
    expect(edges[1]!.labelPosition).toEqual({ x: 100, y: 50 });
    expect(edges[1]!.labelLines).toEqual(["second"]);
  });

  it("handles zero-length edge (coincident waypoints)", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 50, y: 50 },
          { x: 50, y: 50 },
        ],
        label: "zero",
      }),
    ];

    sizeEdgeLabels(edges);

    expect(edges[0]!.labelPosition).toEqual({ x: 50, y: 50 });
    expect(edges[0]!.labelLines).toEqual(["zero"]);
  });

  it("respects labelOverflow option for truncation", () => {
    const edges: PositionedEdge[] = [
      makeEdge({
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        label: "A very long label that would normally wrap",
      }),
    ];

    sizeEdgeLabels(edges, { labelOverflow: "truncate" });

    // Truncation produces a single line with ellipsis
    expect(edges[0]!.labelLines.length).toBe(1);
    // Should end with ellipsis for truncated text
    const line = edges[0]!.labelLines[0]!;
    if (typeof line === "string") {
      expect(line.endsWith("…")).toBe(true);
    }
  });
});
