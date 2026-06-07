import type {
  DiagramKind,
  DiagramTheme,
  DiagramThemeOverride,
  StyleSheet,
  StyleTokenValue,
} from "./types";

/** Fully resolved style sheet with typed theme defaults and legacy rules. */
export interface ResolvedStyleSheet {
  /** Resolved typed theme after diagram-kind defaults and overrides are applied. */
  theme: DiagramTheme;
  /** Flattened theme tokens merged with legacy style sheet tokens. */
  tokens: Record<string, StyleTokenValue>;
  /** Theme-derived base rules merged with legacy style sheet rules. */
  rules: Record<string, Record<string, StyleTokenValue>>;
}

/** Options for resolving a document style sheet. */
export interface ResolveStyleSheetOptions {
  /** Diagram kind used to select typed theme defaults. */
  kind?: DiagramKind;
  /** Additional typed theme overrides applied after document overrides. */
  theme?: DiagramThemeOverride;
}

/** Default neutral DrawSpec theme shared by all diagram kinds. */
export const DEFAULT_DIAGRAM_THEME: DiagramTheme = {
  colors: {
    primary: "#2563eb",
    secondary: "#64748b",
    accent: "#7c3aed",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    textSecondary: "#475569",
    success: "#16a34a",
    warning: "#d97706",
    error: "#dc2626",
    info: "#0284c7",
    border: "#cbd5e1",
    codeBackground: "#e2e8f0",
    divider: "#e2e8f0",
    disabled: "#94a3b8",
    link: "#2563eb",
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    monospaceFontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    sizes: {
      heading: 18,
      body: 14,
      caption: 12,
      label: 13,
    },
    weights: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: 1.4,
  },
  edges: {
    defaultStroke: "#475569",
    defaultStrokeWidth: 1.5,
    dashPatterns: {
      solid: "",
      dashed: "6 4",
      dotted: "2 3",
    },
    arrowheadDefaults: {
      shape: "triangle",
      size: 8,
      fill: "#475569",
    },
  },
  nodes: {
    defaultFill: "#f8fafc",
    defaultStroke: "#cbd5e1",
    defaultStrokeWidth: 1,
    borderRadius: 8,
  },
  spacing: {
    padding: {
      small: 8,
      medium: 12,
      large: 16,
    },
    margin: {
      small: 8,
      medium: 16,
      large: 24,
    },
    gap: {
      small: 8,
      medium: 16,
      large: 32,
    },
  },
};

/** Default typed themes keyed by diagram kind. */
export const DIAGRAM_KIND_THEME_DEFAULTS: Record<DiagramKind, DiagramTheme> = {
  architecture: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#0f766e", accent: "#14b8a6" },
    nodes: { borderRadius: 10 },
  }),
  dynamic: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#2563eb", accent: "#38bdf8" },
    edges: { defaultStrokeWidth: 2 },
  }),
  sequence: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#4f46e5", surface: "#eef2ff" },
    edges: { dashPatterns: { dashed: "5 5" } },
  }),
  class: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#7c2d12", accent: "#ea580c" },
    nodes: { borderRadius: 4 },
  }),
  component: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#6d28d9", accent: "#a855f7" },
  }),
  deployment: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#0369a1", accent: "#0ea5e9" },
    nodes: { borderRadius: 6 },
  }),
  state: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#15803d", accent: "#22c55e" },
    nodes: { borderRadius: 999 },
  }),
  activity: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#be123c", accent: "#fb7185" },
    nodes: { borderRadius: 12 },
  }),
  "use-case": mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#9333ea", accent: "#c084fc" },
    nodes: { borderRadius: 999 },
  }),
  object: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#854d0e", accent: "#eab308" },
    nodes: { borderRadius: 4 },
  }),
  timing: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#0891b2", accent: "#22d3ee" },
    edges: { defaultStrokeWidth: 2 },
  }),
  er: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#4338ca", accent: "#818cf8" },
    nodes: { borderRadius: 3 },
  }),
  gantt: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#2563eb", accent: "#60a5fa" },
    nodes: { borderRadius: 4 },
  }),
  graph: DEFAULT_DIAGRAM_THEME,
  mindmap: mergeDiagramTheme(DEFAULT_DIAGRAM_THEME, {
    colors: { primary: "#4338ca", accent: "#818cf8" },
    nodes: { borderRadius: 12 },
  }),
};

/**
 * Merges a typed theme override into a complete base theme.
 * @param base - Complete theme used as the merge base.
 * @param override - Partial theme values to apply.
 * @returns A new complete theme without mutating either input.
 */
export function mergeDiagramTheme(
  base: DiagramTheme,
  override: DiagramThemeOverride = {}
): DiagramTheme {
  return {
    colors: { ...base.colors, ...override.colors },
    typography: {
      ...base.typography,
      ...override.typography,
      sizes: { ...base.typography.sizes, ...override.typography?.sizes },
      weights: { ...base.typography.weights, ...override.typography?.weights },
    },
    edges: {
      ...base.edges,
      ...override.edges,
      dashPatterns: { ...base.edges.dashPatterns, ...override.edges?.dashPatterns },
      arrowheadDefaults: {
        ...base.edges.arrowheadDefaults,
        ...override.edges?.arrowheadDefaults,
      },
    },
    nodes: { ...base.nodes, ...override.nodes },
    spacing: {
      padding: { ...base.spacing.padding, ...override.spacing?.padding },
      margin: { ...base.spacing.margin, ...override.spacing?.margin },
      gap: { ...base.spacing.gap, ...override.spacing?.gap },
    },
  };
}

/**
 * Resolves the typed theme for a diagram kind.
 * @param kind - Diagram kind used to select defaults.
 * @param override - Optional typed overrides applied to the selected defaults.
 * @returns A complete diagram theme.
 */
export function resolveDiagramTheme(
  kind: DiagramKind = "graph",
  override?: DiagramThemeOverride
): DiagramTheme {
  return mergeDiagramTheme(DIAGRAM_KIND_THEME_DEFAULTS[kind], override);
}

/**
 * Flattens a typed theme into dot-delimited legacy style tokens.
 * @param theme - Complete typed theme to flatten.
 * @returns Legacy token map using keys such as `colors.primary` and `spacing.gap.medium`.
 */
export function createThemeTokens(theme: DiagramTheme): Record<string, StyleTokenValue> {
  return {
    "colors.primary": theme.colors.primary,
    "colors.secondary": theme.colors.secondary,
    "colors.accent": theme.colors.accent,
    "colors.background": theme.colors.background,
    "colors.surface": theme.colors.surface,
    "colors.text": theme.colors.text,
    "colors.textSecondary": theme.colors.textSecondary,
    "colors.success": theme.colors.success,
    "colors.warning": theme.colors.warning,
    "colors.error": theme.colors.error,
    "colors.info": theme.colors.info,
    "colors.border": theme.colors.border,
    "colors.codeBackground": theme.colors.codeBackground,
    "colors.divider": theme.colors.divider,
    "colors.disabled": theme.colors.disabled,
    "colors.link": theme.colors.link,
    "typography.fontFamily": theme.typography.fontFamily,
    "typography.monospaceFontFamily": theme.typography.monospaceFontFamily,
    "typography.sizes.heading": theme.typography.sizes.heading,
    "typography.sizes.body": theme.typography.sizes.body,
    "typography.sizes.caption": theme.typography.sizes.caption,
    "typography.sizes.label": theme.typography.sizes.label,
    "typography.weights.regular": theme.typography.weights.regular,
    "typography.weights.medium": theme.typography.weights.medium,
    "typography.weights.bold": theme.typography.weights.bold,
    "typography.lineHeight": theme.typography.lineHeight,
    "edges.defaultStroke": theme.edges.defaultStroke,
    "edges.defaultStrokeWidth": theme.edges.defaultStrokeWidth,
    "edges.dashPatterns.solid": theme.edges.dashPatterns.solid,
    "edges.dashPatterns.dashed": theme.edges.dashPatterns.dashed,
    "edges.dashPatterns.dotted": theme.edges.dashPatterns.dotted,
    "edges.arrowheadDefaults.shape": theme.edges.arrowheadDefaults.shape,
    "edges.arrowheadDefaults.size": theme.edges.arrowheadDefaults.size,
    "edges.arrowheadDefaults.fill": theme.edges.arrowheadDefaults.fill,
    "nodes.defaultFill": theme.nodes.defaultFill,
    "nodes.defaultStroke": theme.nodes.defaultStroke,
    "nodes.defaultStrokeWidth": theme.nodes.defaultStrokeWidth,
    "nodes.borderRadius": theme.nodes.borderRadius,
    "spacing.padding.small": theme.spacing.padding.small,
    "spacing.padding.medium": theme.spacing.padding.medium,
    "spacing.padding.large": theme.spacing.padding.large,
    "spacing.margin.small": theme.spacing.margin.small,
    "spacing.margin.medium": theme.spacing.margin.medium,
    "spacing.margin.large": theme.spacing.margin.large,
    "spacing.gap.small": theme.spacing.gap.small,
    "spacing.gap.medium": theme.spacing.gap.medium,
    "spacing.gap.large": theme.spacing.gap.large,
  };
}

/**
 * Creates base legacy style rules from a typed theme.
 * @param theme - Complete typed theme used to derive rules.
 * @returns Legacy selector rules for node, edge, text, and canvas defaults.
 */
export function createThemeRules(
  theme: DiagramTheme
): Record<string, Record<string, StyleTokenValue>> {
  return {
    canvas: {
      background: theme.colors.background,
    },
    node: {
      fill: theme.nodes.defaultFill,
      stroke: theme.nodes.defaultStroke,
      strokeWidth: theme.nodes.defaultStrokeWidth,
      borderRadius: theme.nodes.borderRadius,
    },
    edge: {
      stroke: theme.edges.defaultStroke,
      strokeWidth: theme.edges.defaultStrokeWidth,
      strokeDasharray: theme.edges.dashPatterns.solid,
    },
    text: {
      fill: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.regular,
      lineHeight: theme.typography.lineHeight,
    },
  };
}

/**
 * Resolves typed theme defaults and legacy style sheet data into a single style sheet.
 * @param styleSheet - Optional document style sheet with legacy tokens and rules.
 * @param options - Resolution options for diagram kind and extra typed overrides.
 * @returns A resolved style sheet that preserves legacy tokens and rules.
 */
export function resolveStyleSheet(
  styleSheet: StyleSheet = {},
  options: ResolveStyleSheetOptions = {}
): ResolvedStyleSheet {
  const documentTheme = resolveDiagramTheme(options.kind, styleSheet.theme);
  const theme = mergeDiagramTheme(documentTheme, options.theme);
  const themeRules = createThemeRules(theme);

  return {
    theme,
    tokens: {
      ...createThemeTokens(theme),
      ...styleSheet.tokens,
    },
    rules: Object.fromEntries(
      Object.entries({ ...themeRules, ...styleSheet.rules }).map(([selector, rule]) => [
        selector,
        { ...themeRules[selector], ...rule },
      ])
    ),
  };
}
