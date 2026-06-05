import type { Diagnostic } from "./diagnostic";

/** Diagram categories supported by DrawSpec IR documents. */
export type DiagramKind =
  | "architecture"
  | "dynamic"
  | "sequence"
  | "class"
  | "component"
  | "deployment"
  | "state"
  | "activity"
  | "use-case"
  | "object"
  | "timing"
  | "er"
  | "graph";

/** Source location for an element produced from author code. */
export interface SourceRef {
  file: string;
  line: number;
  column: number;
  symbol?: string;
}

/** Reference to a named style rule and optional variant. */
export interface StyleRef {
  /** Style rule identifier in the document style sheet. */
  id: string;
  /** Optional variant name scoped to the referenced style rule. */
  variant?: string;
}

/** Layout preferences attached to a diagram document. */
export interface LayoutSpec {
  engine?: string;
  direction?: "tb" | "bt" | "lr" | "rl";
  rankSpacing?: number;
  nodeSpacing?: number;
  metadata?: Record<string, unknown>;
}

/** Semantic color tokens used by typed diagram themes. */
export interface ColorPalette {
  /** Primary brand or emphasis color. */
  primary: string;
  /** Secondary brand or supporting emphasis color. */
  secondary: string;
  /** Accent color for highlights and callouts. */
  accent: string;
  /** Canvas background color. */
  background: string;
  /** Element surface fill color. */
  surface: string;
  /** Primary text color. */
  text: string;
  /** Secondary or muted text color. */
  textSecondary: string;
  /** Success state color. */
  success: string;
  /** Warning state color. */
  warning: string;
  /** Error state color. */
  error: string;
  /** Informational state color. */
  info: string;
  /** Border stroke color. */
  border: string;
  /** Divider stroke color. */
  divider: string;
  /** Disabled element color. */
  disabled: string;
}

/** Font size tokens for diagram labels and captions. */
export interface TypographySizeConfig {
  /** Heading text size. */
  heading: number;
  /** Body text size. */
  body: number;
  /** Caption text size. */
  caption: number;
  /** Label text size. */
  label: number;
}

/** Font weight tokens for diagram text. */
export interface TypographyWeightConfig {
  /** Regular text weight. */
  regular: number;
  /** Medium emphasis text weight. */
  medium: number;
  /** Bold text weight. */
  bold: number;
}

/** Typography tokens used by diagram themes. */
export interface TypographyConfig {
  /** CSS font-family value used for diagram text. */
  fontFamily: string;
  /** Semantic font sizes. */
  sizes: TypographySizeConfig;
  /** Semantic font weights. */
  weights: TypographyWeightConfig;
  /** Unitless default line height. */
  lineHeight: number;
}

/** Named stroke dash arrays for edge rendering. */
export interface DashPatternConfig {
  /** Solid line with no dash array. */
  solid: string;
  /** Dashed line dash array. */
  dashed: string;
  /** Dotted line dash array. */
  dotted: string;
}

/** Defaults for edge arrowhead rendering. */
export interface ArrowheadDefaults {
  /** Default arrowhead shape identifier. */
  shape: string;
  /** Default arrowhead size in pixels. */
  size: number;
  /** Default arrowhead fill color. */
  fill: string;
}

/** Edge styling defaults used by typed diagram themes. */
export interface EdgeStyleConfig {
  /** Default edge stroke color. */
  defaultStroke: string;
  /** Default edge stroke width in pixels. */
  defaultStrokeWidth: number;
  /** Named stroke dash patterns. */
  dashPatterns: DashPatternConfig;
  /** Default arrowhead styling. */
  arrowheadDefaults: ArrowheadDefaults;
}

/** Node styling defaults used by typed diagram themes. */
export interface NodeStyleConfig {
  /** Default node fill color. */
  defaultFill: string;
  /** Default node stroke color. */
  defaultStroke: string;
  /** Default node stroke width in pixels. */
  defaultStrokeWidth: number;
  /** Default node corner radius in pixels. */
  borderRadius: number;
}

/** Small, medium, and large spacing scale. */
export interface SpacingScaleConfig {
  /** Small spacing value in pixels. */
  small: number;
  /** Medium spacing value in pixels. */
  medium: number;
  /** Large spacing value in pixels. */
  large: number;
}

/** Spacing tokens used by typed diagram themes. */
export interface SpacingConfig {
  /** Padding spacing scale. */
  padding: SpacingScaleConfig;
  /** Margin spacing scale. */
  margin: SpacingScaleConfig;
  /** Gap spacing scale. */
  gap: SpacingScaleConfig;
}

/** Complete typed theme configuration for a DrawSpec diagram. */
export interface DiagramTheme {
  /** Semantic diagram color palette. */
  colors: ColorPalette;
  /** Typography defaults and tokens. */
  typography: TypographyConfig;
  /** Edge styling defaults and tokens. */
  edges: EdgeStyleConfig;
  /** Node styling defaults and tokens. */
  nodes: NodeStyleConfig;
  /** Spacing defaults and tokens. */
  spacing: SpacingConfig;
}

/** Backward-compatible alias for a typed diagram theme. */
export type Theme = DiagramTheme;

/** Partial typed theme override accepted by documents and theme utilities. */
export interface DiagramThemeOverride {
  /** Color palette overrides. */
  colors?: Partial<ColorPalette>;
  /** Typography overrides. */
  typography?: Partial<Omit<TypographyConfig, "sizes" | "weights">> & {
    /** Font size overrides. */
    sizes?: Partial<TypographySizeConfig>;
    /** Font weight overrides. */
    weights?: Partial<TypographyWeightConfig>;
  };
  /** Edge style overrides. */
  edges?: Partial<Omit<EdgeStyleConfig, "dashPatterns" | "arrowheadDefaults">> & {
    /** Dash pattern overrides. */
    dashPatterns?: Partial<DashPatternConfig>;
    /** Arrowhead default overrides. */
    arrowheadDefaults?: Partial<ArrowheadDefaults>;
  };
  /** Node style overrides. */
  nodes?: Partial<NodeStyleConfig>;
  /** Spacing overrides. */
  spacing?: {
    /** Padding spacing overrides. */
    padding?: Partial<SpacingScaleConfig>;
    /** Margin spacing overrides. */
    margin?: Partial<SpacingScaleConfig>;
    /** Gap spacing overrides. */
    gap?: Partial<SpacingScaleConfig>;
  };
}

/** Legacy token value supported by document style sheets. */
export type StyleTokenValue = string | number;

/** Document style sheet with legacy tokens/rules plus optional typed theme overrides. */
export interface StyleSheet {
  /** Optional typed theme overrides for this diagram document. */
  theme?: DiagramThemeOverride;
  /** Legacy free-form style tokens retained for backward compatibility. */
  tokens?: Record<string, StyleTokenValue>;
  /** Legacy free-form selector rules retained for backward compatibility. */
  rules?: Record<string, Record<string, StyleTokenValue>>;
}

/** Root DrawSpec intermediate representation for a diagram. */
export interface DiagramDocument {
  schemaVersion: string;
  id: string;
  title?: string;
  kind: DiagramKind;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  annotations: DiagramAnnotation[];
  layout?: LayoutSpec;
  styles?: StyleSheet;
  metadata?: Record<string, unknown>;
  diagnostics?: Diagnostic[];
}

/** Node element in a diagram document. */
export interface DiagramNode {
  id: string;
  kind: string;
  label?: string;
  description?: string;
  parentId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}

/** Edge element in a diagram document. */
export interface DiagramEdge {
  id: string;
  kind: string;
  sourceId: string;
  targetId: string;
  label?: string;
  direction?: "forward" | "backward" | "bidirectional" | "none";
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}

/** Group element in a diagram document. */
export interface DiagramGroup {
  id: string;
  kind: string;
  label?: string;
  description?: string;
  parentId?: string;
  childIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}

/** Annotation element in a diagram document. */
export interface DiagramAnnotation {
  id: string;
  kind: string;
  label?: string;
  description?: string;
  targetId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}
