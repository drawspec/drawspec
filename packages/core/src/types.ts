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
| "gantt"
  | "graph"
  | "mindmap";

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
  /** Background color for inline code labels. */
  codeBackground: string;
  /** Link text color for formatted labels. */
  link: string;
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
  /** CSS monospace font-family value used for inline code label segments. */
  monospaceFontFamily: string;
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

export type LabelOverflow = "wrap" | "truncate";

/** Controls how edge labels are rotated relative to the edge angle.
 * - "none" — Always horizontal (default)
 * - "auto" — Rotate to follow edge angle, flip if upside-down
 */
export type LabelRotation = "none" | "auto";

/** A segment of formatted text within a label. */
export interface TextSegment {
  /** Segment text content. */
  readonly text: string;
  /** Render this segment with the theme bold font weight. */
  readonly bold?: boolean;
  /** Render this segment with italic font style. */
  readonly italic?: boolean;
  /** Render this segment with the theme monospace font family. */
  readonly code?: boolean;
  /** Link target for future interactive renderers. */
  readonly href?: string;
}

/** Rich text label content represented as ordered formatted text segments. */
export type RichText = readonly TextSegment[];

/** Label content accepted by diagram elements. Strings remain fully backward compatible. */
export type LabelContent = string | RichText;

/** Visual style for edge label containers. */
export type EdgeLabelStyle = "fill" | "stroke" | "both" | "none";

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
  /** Label overflow behavior. Default: "wrap". */
  labelOverflow?: LabelOverflow;
  /** Default edge label container style. Default: "fill". */
  edgeLabelStyle?: EdgeLabelStyle;
  /** Default label rotation mode for all edges. Default: "none". */
  labelRotation?: LabelRotation;
  styles?: StyleSheet;
  metadata?: Record<string, unknown>;
  diagnostics?: Diagnostic[];
}

/** Named built-in icon shapes provided by DrawSpec. */
export type BuiltinIconName =
  | "person"
  | "actor"
  | "component"
  | "database"
  | "queue"
  | "browser"
  | "mobile"
  | "cloud"
  | "cylinder"
  | "hexagon";

/** Size of an icon in pixels. */
export interface IconSize {
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
}

/** Visual appearance overrides for an icon. */
export interface IconAppearance {
  /** Fill color. Overrides kind-based defaults. */
  fill?: string;
  /** Stroke color. Overrides kind-based defaults. */
  stroke?: string;
  /** Stroke width in pixels. */
  strokeWidth?: number;
  /** Text color for text-based icons. */
  color?: string;
  /** Opacity (0–1). */
  opacity?: number;
}

/** Placement of an icon relative to the node label. */
export type IconPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | {
      /** Side placement with optional alignment and offset. */
      side: "top" | "bottom" | "left" | "right";
      /** Horizontal alignment within the side lane. Default: "center". */
      align?: "start" | "center" | "end";
      /** Fine-grained pixel offset from the computed position. */
      offset?: { x: number; y: number };
    };

/** Source for an external image. */
export type ImageSource =
  | { type: "url"; href: string }
  | { type: "data"; mimeType: string; data: string }
  | { type: "asset"; id: string; href: string };

/** Base properties shared by all icon types. */
interface BaseIconSpec {
  /** Optional identifier for the icon within the node. */
  id?: string;
  /** Placement relative to the label. Default: "top". */
  placement?: IconPlacement;
  /** Explicit size. Defaults vary by icon type. */
  size?: IconSize;
  /** Visual appearance overrides. */
  style?: IconAppearance;
}

/** A built-in vector icon provided by DrawSpec. */
export interface BuiltinIconSpec extends BaseIconSpec {
  type: "builtin";
  /** Name of the built-in icon shape. */
  name: BuiltinIconName;
}

/** An external image icon (SVG, PNG, etc.). */
export interface ImageIconSpec extends BaseIconSpec {
  type: "image";
  /** Image source. */
  src: ImageSource;
  /** Required: explicit size for deterministic layout. */
  size: IconSize;
}

/** A text-based icon (emoji, letter badge, etc.). */
export interface TextIconSpec extends BaseIconSpec {
  type: "text";
  /** Text content to render as the icon. */
  text: string;
  /** Font family for rendering. Default: inherit from theme. */
  fontFamily?: string;
  /** Font size in pixels. Default: 24. */
  fontSize?: number;
}

/** Icon specification attached to a diagram node. */
export type IconSpec = BuiltinIconSpec | TextIconSpec | ImageIconSpec;

/** Shape of a node's outer geometry. */
export type NodeShapeSpec =
  /** Rounded rectangle with an optional corner radius. */
  | { type: "rounded-rect"; radius?: number }
  /** Plain rectangle. */
  | { type: "rect" }
  /** Database-style cylinder with an optional top/bottom curve height. */
  | { type: "cylinder"; curve?: number }
  /** Decision or choice diamond. */
  | { type: "diamond" }
  /** Circular state or event marker. */
  | { type: "circle" }
  /** UML final-state marker rendered as concentric circles. */
  | { type: "bullseye" }
  /** Activity fork/join synchronization bar. */
  | { type: "sync-bar" }
  /** Ellipse for use cases and oval nodes. */
  | { type: "ellipse" }
  /** Skewed rectangle used for flowchart input/output nodes. */
  | { type: "parallelogram" }
  /** Document shape with a waved bottom edge. */
  | { type: "document" }
  /** UML component-style rectangle with a top-right tab. */
  | { type: "tabbed-rect" }
  /** UML note with a folded corner. */
  | { type: "note" }
  /** General six-sided polygon node. */
  | { type: "hexagon" }
  /** No visible outer geometry. */
  | { type: "none" };

/** Semantic role for a text line rendered inside a node compartment. */
export type NodeCompartmentTextRole = "name" | "stereotype" | "header" | "member" | "value";

/** Inline text entry rendered inside a node compartment. */
export interface NodeCompartmentLine {
  /** Text content to render. */
  text: string;
  /** Semantic role used by renderers for deterministic styling. */
  role?: NodeCompartmentTextRole;
  /** Horizontal alignment within the compartment. Defaults to `start` for members and `middle` otherwise. */
  align?: "start" | "middle";
  /** CSS font family override for this line. */
  fontFamily?: string;
  /** CSS font style override for this line. */
  fontStyle?: "normal" | "italic";
  /** CSS font weight override for this line. */
  fontWeight?: string | number;
}

/** Content section rendered inside a node with horizontal dividers between adjacent sections. */
export interface NodeCompartment {
  /** Stable compartment identifier scoped to the node. */
  id?: string;
  /** Optional section heading rendered before content lines. */
  header?: string;
  /** Text lines in deterministic render order. */
  lines: readonly NodeCompartmentLine[];
  /** Optional per-section padding override in pixels. */
  padding?: Partial<{ x: number; y: number }>;
  /** Optional per-section line height in pixels. */
  lineHeight?: number;
}

/** Node element in a diagram document. */
export interface DiagramNode {
  id: string;
  kind: string;
  label?: LabelContent;
  description?: string;
  parentId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
  layout?: NodeLayoutOptions;
  /** Icons attached to this node. When undefined, defaults are derived from `kind` during normalization. */
  icons?: IconSpec[];
  /** Explicit node shape. When undefined, derived from `kind` during normalization. */
  shape?: NodeShapeSpec;
  /** Optional compartment sections rendered inside the node body. */
  compartments?: NodeCompartment[];
}

/** Layout sizing options for an individual node. */
export interface NodeLayoutOptions {
  /** Explicit width override. When set, disables auto-width for this node. */
  width?: number;
  /** Explicit height override. When set, disables auto-height for this node. */
  height?: number;
  /** Minimum width. Defaults to global minSize.width. */
  minWidth?: number;
  /** Minimum height. Defaults to global minSize.height. */
  minHeight?: number;
  /** Maximum width. When hit, wrapping or truncation depends on labelOverflow. */
  maxWidth?: number;
  /** Maximum height. When hit, truncates visible lines. */
  maxHeight?: number;
  /** Horizontal and vertical padding around label text. */
  padding?: Partial<{ x: number; y: number }>;
  /** Label wrapping behavior. Defaults to global setting. */
  labelWrap?: "none" | "auto" | number;
  /** Label overflow behavior. Defaults to document-level setting. */
  labelOverflow?: LabelOverflow;
}

/** Edge element in a diagram document. */
export interface DiagramEdge {
  id: string;
  kind: string;
  sourceId: string;
  targetId: string;
  label?: LabelContent;
  direction?: "forward" | "backward" | "bidirectional" | "none";
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
  labelOverflow?: LabelOverflow;
  /** Override edge label container style for this edge. */
  labelStyle?: EdgeLabelStyle;
  /** Override label rotation for this edge. */
  labelRotation?: LabelRotation;
}

/** Group element in a diagram document. */
export interface DiagramGroup {
  id: string;
  kind: string;
  label?: LabelContent;
  description?: string;
  parentId?: string;
  childIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
  labelOverflow?: LabelOverflow;
}

/** Annotation element in a diagram document. */
export interface DiagramAnnotation {
  id: string;
  kind: string;
  label?: LabelContent;
  description?: string;
  targetId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}
