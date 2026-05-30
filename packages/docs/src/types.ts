/**
 * Doc IR — Intermediate Representation for @drawspec/docs
 *
 * All authoring modes (structured JSON, md tagged template) converge on
 * these node types. The compiler resolves references and validates links,
 * then a renderer walks the tree to produce output (HTML, SVG, etc.).
 */

// ─── Inline nodes (nestable within block content) ─────────────────────

export interface TextNode {
  type: "text";
  value: string;
}

export interface BoldNode {
  type: "bold";
  children: DocInline[];
}

export interface ItalicNode {
  type: "italic";
  children: DocInline[];
}

export interface CodeInlineNode {
  type: "codeInline";
  value: string;
}

export interface LinkInlineNode {
  type: "link";
  href: string;
  children: DocInline[];
}

export type DocInline = TextNode | BoldNode | ItalicNode | CodeInlineNode | LinkInlineNode;

// ─── Block nodes (top-level content elements) ─────────────────────────

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingNode {
  type: "heading";
  level: HeadingLevel;
  children: DocInline[];
  id?: string;
}

export interface ParagraphNode {
  type: "paragraph";
  children: DocInline[];
}

export interface CodeBlockNode {
  type: "codeBlock";
  lang?: string;
  source?: string;
  value: string;
  meta?: string;
}

export interface DiagramNode {
  type: "diagram";
  ref: string;
  caption?: string;
}

export type CalloutKind = "note" | "tip" | "warning" | "important" | "caution";

export interface CalloutNode {
  type: "callout";
  kind: CalloutKind;
  title?: string;
  children: DocInline[];
}

export interface LinkBlockNode {
  type: "linkBlock";
  href: string;
  label: string;
  description?: string;
}

export type ListKind = "ordered" | "unordered";

export interface ListNode {
  type: "list";
  kind: ListKind;
  start?: number;
  spread?: boolean;
  children: ListItemNode[];
}

export interface ListItemNode {
  type: "listItem";
  checked?: boolean;
  children: DocBlock[];
}

export interface TableNode {
  type: "table";
  align?: Array<"left" | "center" | "right" | null>;
  children: TableRowNode[];
}

export interface TableRowNode {
  type: "tableRow";
  children: TableCellNode[];
}

export interface TableCellNode {
  type: "tableCell";
  children: DocInline[];
}

export interface ImageNode {
  type: "image";
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface DividerNode {
  type: "divider";
}

export interface TabGroupNode {
  type: "tabGroup";
  children: TabItemNode[];
}

export interface TabItemNode {
  type: "tabItem";
  label: string;
  children: DocBlock[];
}

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

export interface BadgeNode {
  type: "badge";
  label: string;
  variant?: BadgeVariant;
}

export interface BlockquoteNode {
  type: "blockquote";
  children: DocBlock[];
}

export interface ThematicBreakNode {
  type: "thematicBreak";
}

// ─── Union types ──────────────────────────────────────────────────────

export type DocBlock =
  | HeadingNode
  | ParagraphNode
  | CodeBlockNode
  | DiagramNode
  | CalloutNode
  | LinkBlockNode
  | ListNode
  | TableNode
  | ImageNode
  | DividerNode
  | TabGroupNode
  | BadgeNode
  | BlockquoteNode
  | ThematicBreakNode;

// ─── Doc document ─────────────────────────────────────────────────────

export interface DocDefinition {
  title: string;
  description?: string;
  content: DocContentInput;
  metadata?: Record<string, unknown>;
}

/** Content is an array of block nodes */
export type DocContentInput = DocBlock[];

export interface DocDocument {
  schemaVersion: string;
  title: string;
  description?: string;
  content: DocBlock[];
  metadata?: Record<string, unknown>;
}

// ─── Compiler types ───────────────────────────────────────────────────

export interface CompileOptions {
  /** Base directory for resolving relative file references */
  baseDir?: string;
  /** Custom diagram resolver — receives ref path, returns DiagramDocument */
  resolveDiagram?: (ref: string) => unknown;
  /** Custom file reader — receives path, returns file content string */
  readFile?: (path: string) => Promise<string>;
  /** Whether to validate that referenced links/files exist */
  validateReferences?: boolean;
}

export interface CompiledDocDocument extends DocDocument {
  resolved: boolean;
  diagnostics: CompileDiagnostic[];
}

export interface CompileDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  nodeType?: string;
  ref?: string;
}

// ─── Render types ─────────────────────────────────────────────────────

export interface HtmlRenderOptions {
  /** CSS class prefix for generated elements (default: "ds") */
  classPrefix?: string;
  /** Whether to include inline styles (default: true) */
  inlineStyles?: boolean;
  /** Custom syntax highlighter — overrides Shiki */
  highlightCode?: (code: string, lang: string) => Promise<string>;
}
