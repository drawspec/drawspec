/**
 * TSDoc extractor plugin — extracts structured documentation from
 * TypeScript source files using the TypeScript compiler API and
 * `@microsoft/tsdoc`.
 */

import { join } from "node:path";
import {
  DocCodeSpan,
  DocNodeContainer,
  DocParagraph,
  DocPlainText,
  DocSection,
  DocSoftBreak,
  TSDocParser,
} from "@microsoft/tsdoc";
import * as ts from "typescript";
import type { DocExtractor, ExtractedDoc, ExtractOptions } from "./extractor";
import type {
  CalloutNode,
  CodeBlockNode,
  DocBlock,
  HeadingNode,
  ParagraphNode,
  TableNode,
} from "./types";

export function createTSDocExtractor(): DocExtractor {
  return new TSDocExtractorInternal();
}

class TSDocExtractorInternal implements DocExtractor {
  readonly name = "TSDoc";
  readonly extensions = [".ts", ".tsx", ".mts", ".cts"] as const;

  async extract(files: string[], options?: ExtractOptions): Promise<ExtractedDoc[]> {
    const results: ExtractedDoc[] = [];
    for (const file of files) {
      const resolvedPath = options?.baseDir ? join(options.baseDir, file) : file;
      const source = await (options?.readFile?.(resolvedPath) ?? defaultReadFile(resolvedPath));
      const docs = extractFromFile(file, source);
      results.push(...docs);
    }
    return results;
  }
}

async function defaultReadFile(path: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  return await readFile(path, "utf-8");
}

interface SymbolInfo {
  name: string;
  kind: string;
  line: number;
  exported: boolean;
  rawComment: string | undefined;
}

function extractFromFile(filePath: string, source: string): ExtractedDoc[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const symbols = collectSymbols(sourceFile, source);
  const results: ExtractedDoc[] = [];

  for (const sym of symbols) {
    if (!sym.rawComment) continue;
    const parsed = parseTSDocComment(sym.rawComment);
    if (!parsed) continue;

    const content = buildDocBlocks(sym, parsed);
    const description = extractDescription(parsed);

    const doc: ExtractedDoc = {
      name: sym.name,
      kind: sym.kind,
      source: filePath,
      line: sym.line,
      description,
      content,
      exported: sym.exported,
    };

    const params = extractParamsFromTSDoc(parsed);
    if (params.length > 0) doc.params = params;

    const returns = extractReturns(parsed);
    if (returns !== undefined) doc.returns = returns;

    const examples = extractExamples(parsed);
    if (examples.length > 0) doc.examples = examples;

    results.push(doc);
  }

  return results;
}

function collectSymbols(sourceFile: ts.SourceFile, source: string): SymbolInfo[] {
  const results: SymbolInfo[] = [];

  function visit(node: ts.Node): void {
    if (ts.isVariableStatement(node)) {
      const isExported = hasExportModifier(node);
      const rawComment = getLeadingComment(node, source);
      if (rawComment) {
        for (const decl of node.declarationList.declarations) {
          if (decl.name && ts.isIdentifier(decl.name)) {
            results.push({
              name: decl.name.text,
              kind: "variable",
              line: sourceFile.getLineAndCharacterOfPosition(decl.getStart(sourceFile)).line + 1,
              exported: isExported,
              rawComment,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    const info = extractSymbolInfo(node, sourceFile, source);
    if (info) results.push(info);

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return results;
}

function extractSymbolInfo(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  source: string
): SymbolInfo | null {
  let name: string | undefined;
  let kind: string;

  if (ts.isFunctionDeclaration(node)) {
    if (!node.name) return null;
    name = node.name.text;
    kind = "function";
  } else if (ts.isClassDeclaration(node)) {
    if (!node.name) return null;
    name = node.name.text;
    kind = "class";
  } else if (ts.isInterfaceDeclaration(node)) {
    name = node.name.text;
    kind = "interface";
  } else if (ts.isTypeAliasDeclaration(node)) {
    name = node.name.text;
    kind = "type";
  } else if (ts.isEnumDeclaration(node)) {
    name = node.name.text;
    kind = "enum";
  } else if (ts.isMethodDeclaration(node)) {
    if (!node.name) return null;
    const parentName = getParentName(node);
    name = parentName
      ? `${parentName}/${node.name.getText(sourceFile)}`
      : node.name.getText(sourceFile);
    kind = "method";
  } else if (ts.isPropertyDeclaration(node)) {
    if (!node.name) return null;
    const parentName = getParentName(node);
    name = parentName
      ? `${parentName}/${node.name.getText(sourceFile)}`
      : node.name.getText(sourceFile);
    kind = "property";
  } else if (ts.isPropertySignature(node)) {
    if (!node.name) return null;
    const parentName = getParentName(node);
    name = parentName
      ? `${parentName}/${node.name.getText(sourceFile)}`
      : node.name.getText(sourceFile);
    kind = "property";
  } else if (ts.isMethodSignature(node)) {
    if (!node.name) return null;
    const parentName = getParentName(node);
    name = parentName
      ? `${parentName}/${node.name.getText(sourceFile)}`
      : node.name.getText(sourceFile);
    kind = "method";
  } else if (ts.isEnumMember(node)) {
    const parentName = getParentName(node);
    name = parentName
      ? `${parentName}/${node.name.getText(sourceFile)}`
      : node.name.getText(sourceFile);
    kind = "enumMember";
  } else {
    return null;
  }

  const exported = hasExportModifier(node);
  const rawComment = getLeadingComment(node, source);
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  return { name, kind, line, exported, rawComment };
}

function getParentName(node: ts.Node): string | undefined {
  const parent = node.parent;
  if (!parent) return undefined;
  if (ts.isClassDeclaration(parent) && parent.name) return parent.name.text;
  if (ts.isInterfaceDeclaration(parent)) return parent.name.text;
  if (ts.isEnumDeclaration(parent)) return parent.name.text;
  return undefined;
}

function hasExportModifier(node: ts.Node): boolean {
  if (ts.canHaveModifiers(node) && node.modifiers) {
    return node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }
  if (
    node.parent &&
    ts.isVariableDeclaration(node.parent) &&
    node.parent.parent &&
    ts.isVariableDeclarationList(node.parent.parent) &&
    node.parent.parent.parent &&
    ts.isVariableStatement(node.parent.parent.parent)
  ) {
    return hasExportModifier(node.parent.parent.parent);
  }
  return false;
}

function getLeadingComment(node: ts.Node, source: string): string | undefined {
  const nodeStart = node.getFullStart();
  const commentRanges = ts.getLeadingCommentRanges(source, nodeStart);
  if (!commentRanges || commentRanges.length === 0) return undefined;

  const lastRange = commentRanges[commentRanges.length - 1];
  if (!lastRange) return undefined;
  const commentText = source.substring(lastRange.pos, lastRange.end);

  if (!commentText.startsWith("/**")) return undefined;
  return commentText;
}

// ─── TSDoc parsing ─────────────────────────────────────────────────────

interface ParsedTSDoc {
  summary: string;
  params: Array<{ name: string; description: string }>;
  returns: string | undefined;
  examples: string[];
  customBlocks: Array<{ tagName: string; content: string }>;
  modifiers: Set<string>;
}

function parseTSDocComment(rawComment: string): ParsedTSDoc | null {
  try {
    const parser = new TSDocParser();
    const ctx = parser.parseString(rawComment);
    const doc = ctx.docComment;

    const summary = renderDocNodeToString(doc.summarySection);
    const params: Array<{ name: string; description: string }> = [];
    for (const block of doc.params.blocks) {
      params.push({
        name: block.parameterName,
        description: renderDocNodeToString(block.content),
      });
    }

    let returns: string | undefined;
    if (doc.returnsBlock) {
      returns = renderDocNodeToString(doc.returnsBlock.content);
    }

    const examples: string[] = [];
    const customBlocks: Array<{ tagName: string; content: string }> = [];
    for (const block of doc.customBlocks) {
      const tagName = block.blockTag.tagNameWithUpperCase;
      const content = renderDocNodeToString(block.content);
      if (tagName === "@EXAMPLE") {
        examples.push(content);
      } else {
        customBlocks.push({ tagName: block.blockTag.tagName, content });
      }
    }

    const modifiers = new Set<string>();
    if (doc.modifierTagSet.hasTagName("@public")) modifiers.add("public");
    if (doc.modifierTagSet.hasTagName("@beta")) modifiers.add("beta");
    if (doc.modifierTagSet.hasTagName("@alpha")) modifiers.add("alpha");

    return { summary, params, returns, examples, customBlocks, modifiers };
  } catch {
    const stripped = rawComment
      .replace(/^\/\*\*/, "")
      .replace(/\*\/$/, "")
      .split("\n")
      .map((l) => l.replace(/^\s*\*/, ""))
      .join(" ")
      .trim();
    return {
      summary: stripped,
      params: [],
      returns: undefined,
      examples: [],
      customBlocks: [],
      modifiers: new Set(),
    };
  }
}

function renderDocNodeToString(node: import("@microsoft/tsdoc").DocNode): string {
  if (node instanceof DocSection) {
    return node.nodes.map((n) => renderDocNodeToString(n)).join("");
  }
  if (node instanceof DocParagraph) {
    return `${node.nodes.map((n) => renderDocNodeToString(n)).join("")}\n\n`;
  }
  if (node instanceof DocPlainText) {
    return node.text;
  }
  if (node instanceof DocSoftBreak) {
    return "\n";
  }
  if (node instanceof DocCodeSpan) {
    return `\`${node.code}\``;
  }
  if (node instanceof DocNodeContainer) {
    return node.nodes.map((n) => renderDocNodeToString(n)).join("");
  }
  return "";
}

// ─── Convert to DocBlock[] ─────────────────────────────────────────────

function extractDescription(parsed: ParsedTSDoc): string {
  const firstParagraph = parsed.summary.split("\n\n")[0];
  return firstParagraph?.trim().replace(/\n/g, " ") ?? "";
}

function buildDocBlocks(sym: SymbolInfo, parsed: ParsedTSDoc): DocBlock[] {
  const blocks: DocBlock[] = [];

  blocks.push({
    type: "heading",
    level: 2,
    children: [{ type: "text", value: `${sym.kind}: ${sym.name}` }],
  } satisfies HeadingNode);

  if (parsed.summary.trim()) {
    const paragraphs = parsed.summary.trim().split(/\n\n+/);
    for (const para of paragraphs) {
      blocks.push({
        type: "paragraph",
        children: [{ type: "text", value: para.replace(/\n/g, " ").trim() }],
      } satisfies ParagraphNode);
    }
  }

  if (parsed.params.length > 0) {
    blocks.push(buildParamsTable(parsed.params));
  }

  if (parsed.returns) {
    blocks.push({
      type: "paragraph",
      children: [
        { type: "bold", children: [{ type: "text", value: "Returns:" }] },
        { type: "text", value: ` ${parsed.returns.replace(/\n/g, " ").trim()}` },
      ],
    } satisfies ParagraphNode);
  }

  for (const example of parsed.examples) {
    blocks.push({
      type: "codeBlock",
      lang: "ts",
      value: example.trim(),
    } satisfies CodeBlockNode);
  }

  for (const custom of parsed.customBlocks) {
    blocks.push({
      type: "callout",
      kind: "note",
      title: custom.tagName,
      children: [{ type: "text", value: custom.content.replace(/\n/g, " ").trim() }],
    } satisfies CalloutNode);
  }

  return blocks;
}

function buildParamsTable(params: Array<{ name: string; description: string }>): TableNode {
  const headerRow = {
    type: "tableRow" as const,
    children: [
      { type: "tableCell" as const, children: [{ type: "text" as const, value: "Parameter" }] },
      { type: "tableCell" as const, children: [{ type: "text" as const, value: "Description" }] },
    ],
  };

  const dataRows = params.map(
    (p) =>
      ({
        type: "tableRow",
        children: [
          { type: "tableCell", children: [{ type: "codeInline", value: p.name }] },
          {
            type: "tableCell",
            children: [{ type: "text", value: p.description.replace(/\n/g, " ").trim() }],
          },
        ],
      }) satisfies import("./types").TableRowNode
  );

  return {
    type: "table",
    children: [headerRow, ...dataRows],
  } satisfies TableNode;
}

function extractParamsFromTSDoc(parsed: ParsedTSDoc): Array<{ name: string; description: string }> {
  return parsed.params.map((p) => ({
    name: p.name,
    description: p.description.replace(/\n/g, " ").trim(),
  }));
}

function extractReturns(parsed: ParsedTSDoc): string | undefined {
  return parsed.returns?.replace(/\n/g, " ").trim() || undefined;
}

function extractExamples(parsed: ParsedTSDoc): string[] {
  return parsed.examples.map((e) => e.trim()).filter((e) => e.length > 0);
}
