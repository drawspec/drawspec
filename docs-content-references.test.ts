import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";

declare const Bun: {
  Glob: new (pattern: string) => {
    scan(options: { cwd: string; absolute?: boolean; onlyFiles?: boolean }): AsyncIterable<string>;
  };
};

const CONTENT_DIR = resolve(import.meta.dir, "docs/content");

/**
 * Smoke test: verifies that every @diagram and @source reference in docs
 * resolves to a file that exists and imports without errors.
 *
 * This catches:
 *  - Missing files referenced by @diagram or @source directives
 *  - Broken diagram files that throw at import time (e.g. calling undefined methods)
 *  - Files that don't export a valid default diagram document
 */

interface DiagramRef {
  refPath: string;
  file: string;
  docFile: string;
}

interface SourceRef {
  refPath: string;
  file: string;
  docFile: string;
}

async function collectDocFiles(): Promise<string[]> {
  const files: string[] = [];
  for await (const file of new Bun.Glob("**/*.doc.ts").scan({
    cwd: CONTENT_DIR,
    absolute: true,
    onlyFiles: true,
  })) {
    files.push(file);
  }
  return files.sort();
}

function extractRefs(docFiles: string[]): { diagramRefs: DiagramRef[]; sourceRefs: SourceRef[] } {
  const diagramRefs: DiagramRef[] = [];
  const sourceRefs: SourceRef[] = [];
  const diagramRe = /@diagram\s+(\S+)/g;
  const sourceRe = /@source\s+\S+\s+(\S+)/g;

  for (const docFile of docFiles) {
    const content = readFileSync(docFile, "utf-8");
    const docDir = docFile.slice(0, docFile.lastIndexOf("/"));

    let match: RegExpExecArray | null;

    diagramRe.lastIndex = 0;
    while ((match = diagramRe.exec(content)) !== null) {
      const refPath = match[1];
      if (refPath && !refPath.startsWith("/")) {
        diagramRefs.push({
          refPath,
          file: resolve(docDir, refPath),
          docFile: relative(CONTENT_DIR, docFile),
        });
      }
    }

    sourceRe.lastIndex = 0;
    while ((match = sourceRe.exec(content)) !== null) {
      const refPath = match[1];
      if (refPath && !refPath.startsWith("/")) {
        sourceRefs.push({
          refPath,
          file: resolve(docDir, refPath),
          docFile: relative(CONTENT_DIR, docFile),
        });
      }
    }
  }

  return { diagramRefs, sourceRefs };
}

function toFileUrl(path: string): string {
  return `file://${path.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}

describe("docs content references", async () => {
  const docFiles = await collectDocFiles();
  const { diagramRefs, sourceRefs } = extractRefs(docFiles);

  test(`all ${diagramRefs.length} @diagram references import successfully`, async () => {
    const errors: string[] = [];
    for (const ref of diagramRefs) {
      try {
        const mod = (await import(`${toFileUrl(ref.file)}?t=${Date.now()}`)) as Record<
          string,
          unknown
        >;
        if (mod.default === undefined) {
          errors.push(`${ref.refPath} (in ${ref.docFile}): no default export`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${ref.refPath} (in ${ref.docFile}): ${message}`);
      }
    }
    expect(errors).toEqual([]);
  });

  test(`all ${sourceRefs.length} @source reference files exist`, () => {
    const missing: string[] = [];
    for (const ref of sourceRefs) {
      if (!existsSync(ref.file)) {
        missing.push(`${ref.refPath} (referenced in ${ref.docFile})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
