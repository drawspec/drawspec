import { describe, expect, test } from "bun:test";
import type { DiagramNode } from "@drawspec/core";
import { createTextMeasurer } from "../measure";
import { type NormalizedNodeSizingOptions, sizeGraphNodes } from "../sizing";

const defaultOptions: NormalizedNodeSizingOptions = {
  mode: "auto",
  defaultSize: { width: 120, height: 56 },
  minSize: { width: 60, height: 40 },
  maxSize: { width: Infinity, height: Infinity },
  padding: { x: 16, y: 10 },
  labelWrap: "none",
  fontSize: 14,
  lineHeight: 18.2,
  measurer: createTextMeasurer(),
};

describe("sizeGraphNodes", () => {
  test("fixed mode uses default size", () => {
    const nodes: DiagramNode[] = [{ id: "a", kind: "actor", label: "Short" }];
    const opts = { ...defaultOptions, mode: "fixed" as const };
    const result = sizeGraphNodes(nodes, opts);
    expect(result[0]?.computedWidth).toBe(120);
    expect(result[0]?.computedHeight).toBe(56);
  });

  test("auto mode respects minSize for short labels", () => {
    const nodes: DiagramNode[] = [{ id: "a", kind: "actor", label: "Hi" }];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedWidth).toBeGreaterThanOrEqual(60);
    expect(result[0]?.computedHeight).toBeGreaterThanOrEqual(40);
  });

  test("auto mode grows width for long labels", () => {
    const nodes: DiagramNode[] = [
      { id: "a", kind: "actor", label: "This is a very long label text" },
    ];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedWidth).toBeGreaterThan(120);
  });

  test("explicit width override", () => {
    const nodes: DiagramNode[] = [
      { id: "a", kind: "actor", label: "Long label", layout: { width: 200 } },
    ];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedWidth).toBe(200);
  });

  test("explicit width and height switches to fixed", () => {
    const nodes: DiagramNode[] = [
      { id: "a", kind: "actor", label: "Label", layout: { width: 200, height: 80 } },
    ];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedWidth).toBe(200);
    expect(result[0]?.computedHeight).toBe(80);
  });

  test("maxWidth enables wrapping", () => {
    const nodes: DiagramNode[] = [
      {
        id: "a",
        kind: "actor",
        label: "Very long label that exceeds max",
        layout: { maxWidth: 100 },
      },
    ];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedWidth).toBeLessThanOrEqual(100);
    expect(result[0]?.labelLines.length).toBeGreaterThan(1);
    expect(result[0]?.labelLines.join(" ")).toBe("Very long label that exceeds max");
  });

  test("labelWrap auto wraps text", () => {
    const nodes: DiagramNode[] = [{ id: "a", kind: "actor", label: "Hello world this is a test" }];
    const opts = {
      ...defaultOptions,
      labelWrap: "auto" as const,
      maxSize: { width: 150, height: Infinity },
    };
    const result = sizeGraphNodes(nodes, opts);
    expect(result[0]?.labelLines.length).toBeGreaterThan(1);
  });

  test("newline in label creates multiple lines", () => {
    const nodes: DiagramNode[] = [{ id: "a", kind: "actor", label: "Line 1\nLine 2" }];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.labelLines.length).toBe(2);
  });

  test("rich text labels contribute formatted width", () => {
    const plain = sizeGraphNodes(
      [
        {
          id: "a",
          kind: "component",
          label: "service service service",
          icons: [],
          layout: { minWidth: 0 },
        },
      ],
      defaultOptions
    );
    const rich = sizeGraphNodes(
      [
        {
          id: "a",
          kind: "component",
          label: [{ text: "service service service", bold: true }],
          icons: [],
          layout: { minWidth: 0 },
        },
      ],
      defaultOptions
    );
    expect(rich[0]?.computedWidth).toBeGreaterThan(plain[0]?.computedWidth ?? 0);
  });

  test("rich text maxWidth wraps and preserves segment formatting", () => {
    const nodes: DiagramNode[] = [
      {
        id: "a",
        kind: "component",
        icons: [],
        label: [
          { text: "alpha ", bold: true },
          { text: "beta gamma", code: true },
        ],
        layout: { maxWidth: 90 },
      },
    ];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.labelLines.length).toBeGreaterThan(1);
    const firstLine = result[0]?.labelLines[0];
    expect(typeof firstLine).not.toBe("string");
    if (typeof firstLine !== "string") {
      expect(firstLine[0]?.bold).toBe(true);
    }
  });

  test("deterministic output", () => {
    const nodes: DiagramNode[] = [{ id: "a", kind: "actor", label: "Test label" }];
    const r1 = sizeGraphNodes(nodes, defaultOptions);
    const r2 = sizeGraphNodes(nodes, defaultOptions);
    expect(r1[0]?.computedWidth).toBe(r2[0]?.computedWidth);
    expect(r1[0]?.computedHeight).toBe(r2[0]?.computedHeight);
    expect(r1[0]?.labelLines).toEqual(r2[0]?.labelLines);
  });

  test("node without label uses id", () => {
    const nodes: DiagramNode[] = [{ id: "nodeA", kind: "actor" }];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.labelLines[0]).toBe("nodeA");
  });

  test("default top icons contribute to auto height", () => {
    const nodes: DiagramNode[] = [{ id: "a", kind: "actor", label: "Hi" }];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedHeight).toBe(74.2);
    expect(result[0]?.contentLayout.icons).toEqual([
      {
        id: "a:icon:0",
        spec: { type: "builtin", name: "actor", placement: "top", size: { width: 24, height: 30 } },
        x: 48,
        y: 10,
        width: 24,
        height: 30,
      },
    ]);
    expect(result[0]?.contentLayout.label?.y).toBe(60);
  });

  test("empty icons opt out of default icon sizing", () => {
    const nodes: DiagramNode[] = [{ id: "a", kind: "actor", label: "Hi", icons: [] }];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedHeight).toBe(56);
    expect(result[0]?.contentLayout.icons).toEqual([]);
  });

  test("diamond nodes reserve extra geometry for label space", () => {
    const base = sizeGraphNodes(
      [{ id: "a", kind: "actor", label: "Decision", icons: [] }],
      defaultOptions
    );
    const diamond = sizeGraphNodes(
      [{ id: "a", kind: "decision", label: "Decision", shape: { type: "diamond" } }],
      defaultOptions
    );
    expect(diamond[0]?.computedWidth).toBe(base[0]?.computedWidth * 1.4);
    expect(diamond[0]?.computedHeight).toBe(base[0]?.computedHeight * 1.4);
  });

  test("circle and bullseye nodes use square bounds", () => {
    const result = sizeGraphNodes(
      [
        { id: "start", kind: "initial", shape: { type: "circle" }, layout: { width: 64 } },
        { id: "done", kind: "final", shape: { type: "bullseye" }, layout: { height: 80 } },
      ],
      defaultOptions
    );
    expect(result[0]?.computedWidth).toBe(result[0]?.computedHeight);
    expect(result[1]?.computedWidth).toBe(result[1]?.computedHeight);
  });

  test("sync bars size wide and thin by default", () => {
    const result = sizeGraphNodes(
      [{ id: "fork", kind: "fork", label: "", shape: { type: "sync-bar" } }],
      defaultOptions
    );
    expect(result[0]?.computedWidth).toBeGreaterThanOrEqual(96);
    expect(result[0]?.computedHeight).toBe(18);
  });

  test("left and right icons contribute to auto width", () => {
    const nodes: DiagramNode[] = [
      {
        id: "a",
        kind: "component",
        label: "Hi",
        icons: [
          { type: "builtin", name: "cloud", placement: "left" },
          {
            type: "builtin",
            name: "database",
            placement: { side: "right", offset: { x: 2, y: 3 } },
          },
        ],
        layout: { minWidth: 0 },
      },
    ];
    const result = sizeGraphNodes(nodes, defaultOptions);
    expect(result[0]?.computedWidth).toBe(120);
    expect(result[0]?.contentLayout.icons.map((icon) => [icon.id, icon.x, icon.y])).toEqual([
      ["a:icon:0", 23, 13],
      ["a:icon:1", 75, 16],
    ]);
  });
});
