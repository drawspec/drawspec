import { describe, expect, test } from "bun:test";
import type { DiagramKind, DiagramTheme, StyleSheet, Theme } from "../index";
import {
  createThemeRules,
  createThemeTokens,
  DEFAULT_DIAGRAM_THEME,
  DIAGRAM_KIND_THEME_DEFAULTS,
  mergeDiagramTheme,
  resolveDiagramTheme,
  resolveStyleSheet,
} from "../index";

describe("typed theme infrastructure", () => {
  test("defines a complete typed theme shape", () => {
    const theme: DiagramTheme = DEFAULT_DIAGRAM_THEME;
    const alias: Theme = theme;

    expect(alias.colors.primary).toBe("#2563eb");
    expect(alias.colors.codeBackground).toBe("#e2e8f0");
    expect(alias.colors.link).toBe("#2563eb");
    expect(theme.typography.monospaceFontFamily).toContain("ui-monospace");
    expect(theme.typography.sizes).toEqual({ heading: 18, body: 14, caption: 12, label: 13 });
    expect(theme.typography.weights).toEqual({ regular: 400, medium: 500, bold: 700 });
    expect(theme.edges.dashPatterns).toEqual({ solid: "", dashed: "6 4", dotted: "2 3" });
    expect(theme.edges.arrowheadDefaults).toEqual({ shape: "triangle", size: 8, fill: "#475569" });
    expect(theme.spacing.gap).toEqual({ small: 8, medium: 16, large: 32 });
  });

  test("provides defaults for every diagram kind", () => {
    const kinds: DiagramKind[] = [
      "architecture",
      "dynamic",
      "sequence",
      "class",
      "component",
      "deployment",
      "state",
      "activity",
      "use-case",
      "object",
      "timing",
      "er",
      "graph",
    ];

    expect(Object.keys(DIAGRAM_KIND_THEME_DEFAULTS).sort()).toEqual([...kinds].sort());
    for (const kind of kinds) {
      const theme = resolveDiagramTheme(kind);
      expect(theme.colors.primary).toBe(DIAGRAM_KIND_THEME_DEFAULTS[kind].colors.primary);
      expect(theme.nodes.defaultStrokeWidth).toBeGreaterThan(0);
    }
  });

  test("merges typed theme overrides without mutating the base theme", () => {
    const merged = mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
      colors: { primary: "#111111" },
      typography: { sizes: { body: 16 }, weights: { medium: 600 } },
      edges: { dashPatterns: { dashed: "3 3" }, arrowheadDefaults: { size: 10 } },
      spacing: { gap: { large: 40 } },
    });

    expect(merged.colors.primary).toBe("#111111");
    expect(merged.colors.secondary).toBe(DEFAULT_DIAGRAM_THEME.colors.secondary);
    expect(merged.typography.sizes.body).toBe(16);
    expect(merged.typography.sizes.heading).toBe(DEFAULT_DIAGRAM_THEME.typography.sizes.heading);
    expect(merged.typography.weights.medium).toBe(600);
    expect(merged.edges.dashPatterns.dashed).toBe("3 3");
    expect(merged.edges.arrowheadDefaults.size).toBe(10);
    expect(merged.spacing.gap.large).toBe(40);
    expect(DEFAULT_DIAGRAM_THEME.colors.primary).toBe("#2563eb");
  });

  test("flattens typed theme values into legacy token names", () => {
    const tokens = createThemeTokens(DEFAULT_DIAGRAM_THEME);

    expect(tokens["colors.primary"]).toBe(DEFAULT_DIAGRAM_THEME.colors.primary);
    expect(tokens["colors.codeBackground"]).toBe(DEFAULT_DIAGRAM_THEME.colors.codeBackground);
    expect(tokens["colors.link"]).toBe(DEFAULT_DIAGRAM_THEME.colors.link);
    expect(tokens["typography.monospaceFontFamily"]).toBe(
      DEFAULT_DIAGRAM_THEME.typography.monospaceFontFamily
    );
    expect(tokens["typography.sizes.body"]).toBe(DEFAULT_DIAGRAM_THEME.typography.sizes.body);
    expect(tokens["edges.arrowheadDefaults.shape"]).toBe("triangle");
    expect(tokens["spacing.padding.medium"]).toBe(DEFAULT_DIAGRAM_THEME.spacing.padding.medium);
  });

  test("creates theme-derived legacy rules", () => {
    const rules = createThemeRules(DEFAULT_DIAGRAM_THEME);

    expect(rules["canvas"]?.["background"]).toBe(DEFAULT_DIAGRAM_THEME.colors.background);
    expect(rules["node"]?.["fill"]).toBe(DEFAULT_DIAGRAM_THEME.nodes.defaultFill);
    expect(rules["edge"]?.["strokeWidth"]).toBe(DEFAULT_DIAGRAM_THEME.edges.defaultStrokeWidth);
    expect(rules["text"]?.["fontFamily"]).toBe(DEFAULT_DIAGRAM_THEME.typography.fontFamily);
  });

  test("resolves style sheets while preserving legacy tokens and rules", () => {
    const styleSheet: StyleSheet = {
      theme: {
        colors: { primary: "#123456" },
        nodes: { defaultFill: "#abcdef" },
      },
      tokens: {
        legacyToken: "legacy-value",
        "colors.primary": "legacy-primary",
      },
      rules: {
        node: { stroke: "#654321" },
        custom: { opacity: 0.5 },
      },
    };

    const resolved = resolveStyleSheet(styleSheet, { kind: "architecture" });

    expect(resolved.theme.colors.primary).toBe("#123456");
    expect(resolved.theme.nodes.defaultFill).toBe("#abcdef");
    expect(resolved.tokens["legacyToken"]).toBe("legacy-value");
    expect(resolved.tokens["colors.primary"]).toBe("legacy-primary");
    expect(resolved.rules["node"]?.["fill"]).toBe("#abcdef");
    expect(resolved.rules["node"]?.["stroke"]).toBe("#654321");
    expect(resolved.rules["custom"]).toEqual({ opacity: 0.5 });
  });

  test("applies caller theme overrides after document theme overrides", () => {
    const resolved = resolveStyleSheet(
      { theme: { colors: { primary: "#111111" } } },
      { kind: "graph", theme: { colors: { primary: "#222222" } } }
    );

    expect(resolved.theme.colors.primary).toBe("#222222");
    expect(resolved.tokens["colors.primary"]).toBe("#222222");
  });
});
