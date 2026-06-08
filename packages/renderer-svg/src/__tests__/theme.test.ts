import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import type { PositionedDiagram } from "@drawspec/layout";
import {
  darkTheme,
  defaultTheme,
  highContrastTheme,
  lightTheme,
  renderSvgSync,
  renderThemeStyleBlock,
  resolveTheme,
  themeToCssVariables,
} from "../index";
import type { SvgTheme } from "../types";

function document(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return {
    annotations: [],
    edges: [],
    groups: [],
    id: "theme-test",
    kind: "graph",
    nodes: [],
    schemaVersion: "1.0.0",
    ...overrides,
  } as DiagramDocument;
}

function positionedDiagram(overrides: Partial<PositionedDiagram> = {}): PositionedDiagram {
  const doc = document({ id: "theme-test" });
  return {
    activations: [],
    canvasBounds: { x: 0, y: 0, width: 300, height: 200 },
    document: doc,
    edges: [],
    groups: [],
    height: 200,
    nodes: [],
    width: 300,
    ...overrides,
  };
}

const sampleDoc = document({
  id: "theme-sample",
  kind: "architecture",
  nodes: [{ id: "svc", kind: "component", label: "Service" }],
  edges: [],
  groups: [],
});

const sampleDiagram = positionedDiagram({
  document: sampleDoc,
  nodes: [
    {
      id: "svc",
      kind: "component",
      label: "Service",
      x: 10,
      y: 10,
      width: 80,
      height: 40,
      contentLayout: { icons: [], label: { x: 8, y: 10, lines: ["Service"] } },
      labelLines: ["Service"],
    },
  ],
});

describe("theme exports", () => {
  test("lightTheme and defaultTheme are identical", () => {
    expect(defaultTheme).toEqual(lightTheme);
  });

  test("darkTheme has dark background and light text", () => {
    expect(darkTheme.background).toBe("#0f172a");
    expect(darkTheme.text).toBe("#f8fafc");
    expect(darkTheme.nodeFill).toBe("#1e293b");
    expect(darkTheme.nodeStroke).toBe("#94a3b8");
    expect(darkTheme.edgeStroke).toBe("#94a3b8");
    expect(darkTheme.groupFill).toBe("#1e293b");
    expect(darkTheme.groupStroke).toBe("#475569");
  });

  test("highContrastTheme uses black and white", () => {
    expect(highContrastTheme.background).toBe("#ffffff");
    expect(highContrastTheme.text).toBe("#000000");
    expect(highContrastTheme.nodeStroke).toBe("#000000");
    expect(highContrastTheme.edgeStroke).toBe("#000000");
    expect(highContrastTheme.nodeFill).toBe("#ffffff");
  });

  test("all themes are complete SvgTheme objects", () => {
    const keys: (keyof SvgTheme)[] = [
      "activationFill",
      "activationStroke",
      "background",
      "edgeStroke",
      "fontFamily",
      "fontSize",
      "groupFill",
      "groupStroke",
      "nodeFill",
      "nodeStroke",
      "text",
    ];
    for (const theme of [lightTheme, darkTheme, highContrastTheme]) {
      for (const key of keys) {
        expect(theme[key]).toBeDefined();
      }
    }
  });
});

describe("resolveTheme", () => {
  test("returns lightTheme for undefined", () => {
    expect(resolveTheme(undefined)).toEqual(lightTheme);
  });

  test("returns lightTheme for 'light'", () => {
    expect(resolveTheme("light")).toEqual(lightTheme);
  });

  test("returns darkTheme for 'dark'", () => {
    expect(resolveTheme("dark")).toEqual(darkTheme);
  });

  test("returns highContrastTheme for 'high-contrast'", () => {
    expect(resolveTheme("high-contrast")).toEqual(highContrastTheme);
  });

  test("merges partial theme override onto lightTheme", () => {
    const custom = resolveTheme({ background: "#ff0000", text: "#00ff00" });
    expect(custom.background).toBe("#ff0000");
    expect(custom.text).toBe("#00ff00");
    expect(custom.nodeFill).toBe(lightTheme.nodeFill);
    expect(custom.edgeStroke).toBe(lightTheme.edgeStroke);
  });

  test("custom override preserves all lightTheme defaults for missing keys", () => {
    const custom = resolveTheme({ fontSize: 18 });
    expect(custom.fontSize).toBe(18);
    expect(custom.background).toBe(lightTheme.background);
    expect(custom.fontFamily).toBe(lightTheme.fontFamily);
  });
});

describe("themeToCssVariables", () => {
  test("maps all SvgTheme keys to CSS custom property names", () => {
    const vars = themeToCssVariables(lightTheme);
    expect(vars["--ds-background"]).toBe("#ffffff");
    expect(vars["--ds-text"]).toBe("#0f172a");
    expect(vars["--ds-node-fill"]).toBe("#f8fafc");
    expect(vars["--ds-node-stroke"]).toBe("#334155");
    expect(vars["--ds-edge-stroke"]).toBe("#475569");
    expect(vars["--ds-group-fill"]).toBe("#f8fafc");
    expect(vars["--ds-group-stroke"]).toBe("#94a3b8");
    expect(vars["--ds-activation-fill"]).toBe("#e0f2fe");
    expect(vars["--ds-activation-stroke"]).toBe("#0369a1");
    expect(vars["--ds-font-family"]).toBe("Arial, sans-serif");
    expect(vars["--ds-font-size"]).toBe("14");
  });

  test("dark theme variables have dark values", () => {
    const vars = themeToCssVariables(darkTheme);
    expect(vars["--ds-background"]).toBe("#0f172a");
    expect(vars["--ds-text"]).toBe("#f8fafc");
  });

  test("produces deterministic output for the same theme", () => {
    const first = themeToCssVariables(darkTheme);
    const second = themeToCssVariables(darkTheme);
    expect(Object.keys(first)).toEqual(Object.keys(second));
    expect(first).toEqual(second);
  });
});

describe("renderThemeStyleBlock", () => {
  test("produces a well-formed SVG style element", () => {
    const block = renderThemeStyleBlock(lightTheme);
    expect(block).toContain("<style>");
    expect(block).toContain("</style>");
    expect(block).toContain(":root {");
    expect(block).toContain("--ds-background: #ffffff;");
    expect(block).toContain("--ds-text: #0f172a;");
  });

  test("produces sorted CSS declarations", () => {
    const block = renderThemeStyleBlock(lightTheme);
    const declarationLines = block.split("\n").filter((line) => line.trim().startsWith("--ds-"));
    const names = declarationLines.map((line) => line.trim().split(":")[0]);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  test("is deterministic for the same theme", () => {
    const first = renderThemeStyleBlock(darkTheme);
    const second = renderThemeStyleBlock(darkTheme);
    expect(first).toBe(second);
  });
});

describe("rendering with themes", () => {
  test("light theme (default) produces style block with light values", () => {
    const svg = renderSvgSync(sampleDoc, { positionedDiagram: sampleDiagram });
    expect(svg).toContain("--ds-background: #ffffff;");
    expect(svg).toContain("--ds-text: #0f172a;");
  });

  test("dark theme produces style block with dark values", () => {
    const svg = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "dark",
    });
    expect(svg).toContain("--ds-background: #0f172a;");
    expect(svg).toContain("--ds-text: #f8fafc;");
    expect(svg).toContain("--ds-node-fill: #1e293b;");
    expect(svg).toContain("--ds-node-stroke: #94a3b8;");
  });

  test("high-contrast theme produces style block with black and white", () => {
    const svg = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "high-contrast",
    });
    expect(svg).toContain("--ds-background: #ffffff;");
    expect(svg).toContain("--ds-text: #000000;");
    expect(svg).toContain("--ds-edge-stroke: #000000;");
  });

  test("custom theme override produces merged style block", () => {
    const svg = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: { background: "#1a1a2e", text: "#e0e0e0" },
    });
    expect(svg).toContain("--ds-background: #1a1a2e;");
    expect(svg).toContain("--ds-text: #e0e0e0;");
    expect(svg).toContain("--ds-node-fill: #f8fafc;");
  });

  test("dark theme changes background rect fill", () => {
    const svg = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "dark",
    });
    expect(svg).toContain('fill="#0f172a"');
  });

  test("dark theme changes node fill and stroke", () => {
    const svg = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "dark",
    });
    expect(svg).toContain('fill="#1e293b"');
    expect(svg).toContain('stroke="#94a3b8"');
  });

  test("dark theme changes text fill color", () => {
    const svg = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "dark",
    });
    expect(svg).toContain('fill="#f8fafc"');
  });

  test("dark theme changes edge markers", () => {
    const docWithEdge = document({
      id: "dark-edge-test",
      kind: "graph",
      nodes: [
        { id: "a", kind: "component", label: "A" },
        { id: "b", kind: "component", label: "B" },
      ],
      edges: [{ id: "ab", kind: "calls", sourceId: "a", targetId: "b" }],
      groups: [],
    });
    const diagram: PositionedDiagram = {
      activations: [],
      canvasBounds: { x: 0, y: 0, width: 150, height: 40 },
      document: docWithEdge,
      edges: [
        {
          id: "ab",
          kind: "calls",
          sourceId: "a",
          targetId: "b",
          waypoints: [
            { x: 0, y: 20 },
            { x: 100, y: 20 },
          ],
          labelPosition: { x: 50, y: 20 },
          labelLines: [],
        },
      ],
      groups: [],
      nodes: [
        {
          id: "a",
          kind: "component",
          x: 0,
          y: 0,
          width: 50,
          height: 40,
          contentLayout: { icons: [] },
          labelLines: [],
        },
        {
          id: "b",
          kind: "component",
          x: 100,
          y: 0,
          width: 50,
          height: 40,
          contentLayout: { icons: [] },
          labelLines: [],
        },
      ],
      width: 150,
      height: 40,
    };
    const svg = renderSvgSync(docWithEdge, { positionedDiagram: diagram, theme: "dark" });
    expect(svg).toContain('stroke="#94a3b8"');
  });

  test("renders deterministically for same theme", () => {
    const first = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "dark",
    });
    const second = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "dark",
    });
    expect(first).toBe(second);
  });

  test("undefined theme defaults to light", () => {
    const noTheme = renderSvgSync(sampleDoc, { positionedDiagram: sampleDiagram });
    const explicitLight = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: "light",
    });
    expect(noTheme).toBe(explicitLight);
  });

  test("backward compatibility: defaultTheme still works as partial override", () => {
    const svg = renderSvgSync(sampleDoc, {
      positionedDiagram: sampleDiagram,
      theme: { ...defaultTheme, background: "#f0f0f0" },
    });
    expect(svg).toContain("--ds-background: #f0f0f0;");
  });
});
