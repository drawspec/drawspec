import { describe, expect, test } from "bun:test";
import { computeCanvasBounds } from "../graph-utils";
import type { PositionedDiagram, PositionedEdge, PositionedGroup, PositionedNode } from "../types";

function makeNode(id: string, x: number, y: number, width: number, height: number): PositionedNode {
  return { id, x, y, width, height, kind: "node", label: "" };
}

function makeEdge(id: string, waypoints: { x: number; y: number }[]): PositionedEdge {
  return { id, sourceId: "", targetId: "", waypoints };
}

function makeGroup(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): PositionedGroup {
  return { id, x, y, width, height, kind: "group", label: "", childIds: [] };
}

describe("computeCanvasBounds", () => {
  test("returns bounds for minimal diagram with single node", () => {
    const nodes = [makeNode("n1", 10, 20, 80, 40)];
    const edges: PositionedEdge[] = [];
    const groups: PositionedGroup[] = [];
    const padding = 20;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(-10, 3);
    expect(bounds.y).toBeCloseTo(0, 3);
    expect(bounds.width).toBeCloseTo(120, 3);
    expect(bounds.height).toBeCloseTo(80, 3);
  });

  test("includes node positions and dimensions in bounds", () => {
    const nodes = [makeNode("n1", 0, 0, 100, 50), makeNode("n2", 200, 100, 80, 60)];
    const edges: PositionedEdge[] = [];
    const groups: PositionedGroup[] = [];
    const padding = 10;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(-10, 3);
    expect(bounds.y).toBeCloseTo(-10, 3);
    expect(bounds.width).toBeCloseTo(300, 3);
    expect(bounds.height).toBeCloseTo(180, 3);
  });

  test("includes edge waypoints in bounds", () => {
    const nodes = [makeNode("n1", 0, 0, 100, 50), makeNode("n2", 200, 100, 80, 60)];
    const edges = [
      makeEdge("e1", [
        { x: 50, y: 25 },
        { x: 300, y: 130 },
      ]),
    ];
    const groups: PositionedGroup[] = [];
    const padding = 0;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(0, 3);
    expect(bounds.y).toBeCloseTo(0, 3);
    expect(bounds.width).toBeCloseTo(300, 3);
    expect(bounds.height).toBeCloseTo(160, 3);
  });

  test("includes edge label positions in bounds", () => {
    const nodes = [makeNode("n1", 0, 0, 100, 50), makeNode("n2", 200, 100, 80, 60)];
    const edges: PositionedEdge[] = [
      {
        id: "e1",
        sourceId: "",
        targetId: "",
        waypoints: [
          { x: 50, y: 25 },
          { x: 240, y: 130 },
        ],
        labelPosition: { x: 145, y: 77 },
      },
    ];
    const groups: PositionedGroup[] = [];
    const padding = 0;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(0, 3);
    expect(bounds.y).toBeCloseTo(0, 3);
    expect(bounds.width).toBeCloseTo(280, 3);
    expect(bounds.height).toBeCloseTo(160, 3);
  });

  test("includes group positions and dimensions in bounds", () => {
    const nodes = [makeNode("n1", 50, 60, 100, 50)];
    const edges: PositionedEdge[] = [];
    const groups = [makeGroup("g1", 20, 30, 300, 200)];
    const padding = 0;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(20, 3);
    expect(bounds.y).toBeCloseTo(30, 3);
    expect(bounds.width).toBeCloseTo(300, 3);
    expect(bounds.height).toBeCloseTo(200, 3);
  });

  test("applies padding to all sides", () => {
    const nodes = [makeNode("n1", 50, 50, 100, 100)];
    const edges: PositionedEdge[] = [];
    const groups: PositionedGroup[] = [];
    const padding = 25;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(25, 3);
    expect(bounds.y).toBeCloseTo(25, 3);
    expect(bounds.width).toBeCloseTo(150, 3);
    expect(bounds.height).toBeCloseTo(150, 3);
  });

  test("handles empty diagram gracefully", () => {
    const nodes: PositionedNode[] = [];
    const edges: PositionedEdge[] = [];
    const groups: PositionedGroup[] = [];
    const padding = 10;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(-10, 3);
    expect(bounds.y).toBeCloseTo(-10, 3);
    expect(bounds.width).toBeCloseTo(20, 3);
    expect(bounds.height).toBeCloseTo(20, 3);
  });

  test("includes group labels in bounds", () => {
    const nodes = [makeNode("n1", 100, 100, 80, 40)];
    const edges: PositionedEdge[] = [];
    const groups: PositionedGroup[] = [
      {
        id: "g1",
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        kind: "group",
        label: "Test Group",
        labelLines: ["Test Group"],
        childIds: [],
      },
    ];
    const padding = 0;

    const bounds = computeCanvasBounds({ nodes, edges, groups }, padding);

    expect(bounds.x).toBeCloseTo(50, 3);
    expect(bounds.y).toBeCloseTo(50, 3);
    expect(bounds.width).toBeCloseTo(200, 3);
    expect(bounds.height).toBeCloseTo(150, 3);
  });

  test("handles PositionedDiagram input", () => {
    const diagram: PositionedDiagram = {
      document: { id: "", kind: "graph", nodes: [], edges: [], groups: [], metadata: {} },
      nodes: [makeNode("n1", 0, 0, 50, 50)],
      edges: [],
      groups: [],
      activations: [],
      width: 50,
      height: 50,
    };
    const padding = 5;

    const bounds = computeCanvasBounds(diagram, padding);

    expect(bounds.x).toBeCloseTo(-5, 3);
    expect(bounds.y).toBeCloseTo(-5, 3);
    expect(bounds.width).toBeCloseTo(60, 3);
    expect(bounds.height).toBeCloseTo(60, 3);
  });
});
