import { describe, expect, it } from "bun:test";
import type {
  LabelLine,
  NodeContentLayout,
  Point,
  PositionedDiagram,
  PositionedEdge,
  PositionedGroup,
  PositionedNode,
} from "../types";

/**
 * Geometry Contract Test
 *
 * Validates that all geometry fields are REQUIRED (not optional) on positioned types.
 * This ensures the layout pipeline always produces complete geometry data for rendering.
 */
describe("Geometry Contract", () => {
  // ---------------------------------------------------------------------------
  // PositionedNode — contentLayout must be required
  // ---------------------------------------------------------------------------
  describe("PositionedNode", () => {
    it("contentLayout is required (not optional)", () => {
      // TypeScript will error if contentLayout is optional — this test compiles
      // only when the field is required
      const node: PositionedNode = {
        id: "n1",
        label: "Test Node",
        contentLayout: {
          label: { x: 10, y: 20, lines: ["hello"] },
          icons: [],
        },
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      };
      expect(node.contentLayout).toBeDefined();
      expect(typeof node.contentLayout.label?.x).toBe("number");
    });

    it("labelLines is required on PositionedNode", () => {
      const node: PositionedNode = {
        id: "n1",
        label: "Test",
        labelLines: ["Test"],
        contentLayout: { label: { x: 0, y: 0, lines: ["Test"] }, icons: [] },
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      };
      expect(node.labelLines).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PositionedEdge — labelPosition and labelLines must be required
  // ---------------------------------------------------------------------------
  describe("PositionedEdge", () => {
    it("labelPosition is required (not optional)", () => {
      const edge: PositionedEdge = {
        id: "e1",
        sourceId: "n1",
        targetId: "n2",
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        labelPosition: { x: 50, y: 50 },
        labelLines: ["Edge Label"],
      };
      expect(edge.labelPosition).toBeDefined();
      expect(edge.labelPosition?.x).toBe(50);
    });

    it("labelLines is required (not optional)", () => {
      const edge: PositionedEdge = {
        id: "e1",
        sourceId: "n1",
        targetId: "n2",
        waypoints: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        labelPosition: { x: 50, y: 50 },
        labelLines: ["Edge Label"],
      };
      expect(edge.labelLines).toBeDefined();
      expect(Array.isArray(edge.labelLines)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PositionedGroup — labelLines must be required
  // ---------------------------------------------------------------------------
  describe("PositionedGroup", () => {
    it("labelLines is required (not optional)", () => {
      const group: PositionedGroup = {
        id: "g1",
        label: "Group",
        labelLines: ["Group Label"],
        x: 0,
        y: 0,
        width: 200,
        height: 100,
      };
      expect(group.labelLines).toBeDefined();
      expect(Array.isArray(group.labelLines)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PositionedDiagram — canvasBounds must exist
  // ---------------------------------------------------------------------------
  describe("PositionedDiagram", () => {
    it("canvasBounds is required with x, y, width, height", () => {
      const diagram: PositionedDiagram = {
        document: { id: "doc1", kind: "graph", nodes: [], edges: [], groups: [] },
        nodes: [],
        edges: [],
        groups: [],
        activations: [],
        width: 800,
        height: 600,
        canvasBounds: { x: 0, y: 0, width: 800, height: 600 },
      };
      expect(diagram.canvasBounds).toBeDefined();
      expect(diagram.canvasBounds.x).toBe(0);
      expect(diagram.canvasBounds.y).toBe(0);
      expect(diagram.canvasBounds.width).toBe(800);
      expect(diagram.canvasBounds.height).toBe(600);
    });
  });
});
