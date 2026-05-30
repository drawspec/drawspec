import { resolve } from "node:path";
import type {
  CodeBlockNode,
  CompileDiagnostic,
  CompiledDocDocument,
  CompileOptions,
  DocBlock,
  DocDocument,
} from "./types";

// ─── compileDoc() ─────────────────────────────────────────────────────

/**
 * Compile a DocDocument: resolve file/diagram references, validate links,
 * and produce a CompiledDocDocument with diagnostics.
 */
export async function compileDoc(
  doc: DocDocument,
  options: CompileOptions = {}
): Promise<CompiledDocDocument> {
  const diagnostics: CompileDiagnostic[] = [];
  const content = await resolveContent(doc.content, options, diagnostics);

  const compiled: CompiledDocDocument = {
    ...doc,
    content,
    resolved: true,
    diagnostics,
  };

  return compiled;
}

// ─── Content resolution ───────────────────────────────────────────────

async function resolveContent(
  content: DocBlock[],
  options: CompileOptions,
  diagnostics: CompileDiagnostic[]
): Promise<DocBlock[]> {
  const resolved: DocBlock[] = [];

  for (const block of content) {
    const result = await resolveBlock(block, options, diagnostics);
    resolved.push(result);
  }

  return resolved;
}

async function resolveBlock(
  block: DocBlock,
  options: CompileOptions,
  diagnostics: CompileDiagnostic[]
): Promise<DocBlock> {
  switch (block.type) {
    case "codeBlock":
      return resolveCodeBlock(block, options, diagnostics);

    case "diagram":
      return await resolveDiagram(block, options, diagnostics);

    case "linkBlock":
      if (options.validateReferences && block.href.startsWith("./")) {
        // Could validate file exists here
      }
      return block;

    case "blockquote":
      return {
        ...block,
        children: await resolveContent(block.children, options, diagnostics),
      };

    case "list":
      return {
        ...block,
        children: await Promise.all(
          block.children.map(async (item) => ({
            ...item,
            children: await resolveContent(item.children, options, diagnostics),
          }))
        ),
      };

    case "tabGroup":
      return {
        ...block,
        children: await Promise.all(
          block.children.map(async (tab) => ({
            ...tab,
            children: await resolveContent(tab.children, options, diagnostics),
          }))
        ),
      };

    default:
      return block;
  }
}

async function resolveCodeBlock(
  block: CodeBlockNode,
  options: CompileOptions,
  diagnostics: CompileDiagnostic[]
): Promise<CodeBlockNode> {
  // If the code block has a source reference, read the file
  if (block.source && options.readFile) {
    const sourcePath = options.baseDir ? resolve(options.baseDir, block.source) : block.source;
    try {
      const content = await options.readFile(sourcePath);
      return {
        ...block,
        value: content,
      };
    } catch {
      diagnostics.push({
        severity: "error",
        message: `Failed to read code source file: ${sourcePath}`,
        nodeType: "codeBlock",
        ref: sourcePath,
      });
    }
  }

  return block;
}

async function resolveDiagram(
  block: import("./types").DiagramNode,
  options: CompileOptions,
  diagnostics: CompileDiagnostic[]
): Promise<import("./types").DiagramNode> {
  if (options.resolveDiagram) {
    const resolved = await options.resolveDiagram(block.ref);
    if (!resolved) {
      diagnostics.push({
        severity: "error",
        message: `Failed to resolve diagram reference: ${block.ref}`,
        nodeType: "diagram",
        ref: block.ref,
      });
    }
  }

  return block;
}
