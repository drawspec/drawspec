// @drawspec/docs — Documentation engine for DrawSpec

export type { BuildDocsManifest, BuildDocsOptions, BuildDocsPage } from "./build";
// Compiler
export { buildDocs } from "./build";
export { compileDoc } from "./compiler";

// defineDoc
export { defineDoc } from "./define-doc";
export type { DocExtractor, ExtractedDoc, ExtractOptions } from "./extractor";
// Extractor plugin system
export { createTSDocExtractor } from "./extractor-tsdoc";

// md tagged template
export { initMdParser, md } from "./md-tag";
// HTML Renderer
export { renderDocHtml } from "./renderer-html";
// Types
export type {
  BadgeNode,
  BadgeVariant,
  BlockquoteNode,
  CalloutKind,
  CalloutNode,
  CodeBlockNode,
  CodeInlineNode,
  CompileDiagnostic,
  CompiledDocDocument,
  CompileOptions,
  DiagramNode,
  DividerNode,
  DocBlock,
  DocContentInput,
  DocDefinition,
  DocDocument,
  DocInline,
  HeadingLevel,
  HeadingNode,
  HtmlRenderOptions,
  ImageNode,
  ItalicNode,
  LinkBlockNode,
  LinkInlineNode,
  ListItemNode,
  ListKind,
  ListNode,
  ParagraphNode,
  TabGroupNode,
  TabItemNode,
  TableCellNode,
  TableNode,
  TableRowNode,
  TextNode,
  ThematicBreakNode,
} from "./types";
