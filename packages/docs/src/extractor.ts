/**
 * DocExtractor — Plugin interface for extracting structured documentation
 * from source code comments.
 *
 * Each extractor handles specific file extensions and converts TSDoc,
 * JSDoc, Python docstrings, etc. into a uniform `ExtractedDoc` shape
 * that feeds into the `defineDoc()` content pipeline.
 */

import type { DocBlock } from "./types";

// ─── Plugin interface ──────────────────────────────────────────────────

/** A plugin that extracts structured documentation from source code comments. */
export interface DocExtractor {
  /** Human-readable name for this extractor (e.g., "TSDoc", "Python Docstrings"). */
  readonly name: string;
  /** File extensions this extractor handles (e.g., [".ts", ".tsx"]). */
  readonly extensions: readonly string[];
  /** Extract documentation blocks from source files. */
  extract(files: string[], options?: ExtractOptions): Promise<ExtractedDoc[]>;
}

// ─── Options ───────────────────────────────────────────────────────────

export interface ExtractOptions {
  /** Base directory for resolving relative paths. */
  baseDir?: string;
  /** Custom file reader (defaults to Bun.file). */
  readFile?: (path: string) => Promise<string>;
}

// ─── Extracted result ──────────────────────────────────────────────────

export interface ExtractedDoc {
  /** Fully qualified name (e.g., "MyClass/myMethod"). */
  name: string;
  /** Kind of symbol (e.g., "function", "class", "interface", "method", "property", "type", "enum"). */
  kind: string;
  /** Source file path. */
  source: string;
  /** Line number in source file (1-based). */
  line: number;
  /** Short description (first paragraph of TSDoc). */
  description: string;
  /** Full documentation as DocBlock[] (compatible with defineDoc content). */
  content: DocBlock[];
  /** Parameters (for functions/methods). */
  params?: Array<{ name: string; description: string; type?: string }>;
  /** Return type description. */
  returns?: string;
  /** Code examples. */
  examples?: string[];
  /** Whether this is exported (public API). */
  exported: boolean;
}
