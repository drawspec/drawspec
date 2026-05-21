import { dirname, join } from "node:path";
import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import type { RuleConfig } from "@drawspec/validation";
import { recommended, recommendedRules, validate } from "@drawspec/validation";

export interface CompileResult {
  document: DiagramDocument | undefined;
  diagnostics: Diagnostic[];
}

export interface CompilerOptions {
  rules?: RuleConfig;
}

export function validateDocument(
  document: DiagramDocument,
  options: CompilerOptions = {}
): Diagnostic[] {
  const rules: RuleConfig = {
    ...recommended.rules,
    ...options.rules,
  };
  return validate({
    diagram: document,
    rules: recommendedRules,
    config: { rules },
  }).diagnostics;
}

export function compileDocument(value: unknown, options: CompilerOptions = {}): CompileResult {
  const document = extractDiagramDocument(value);
  if (document === undefined) {
    return {
      document: undefined,
      diagnostics: [
        {
          code: "drawspec/lsp",
          severity: "error",
          message: "Exported value is not a DiagramDocument",
        },
      ],
    };
  }

  const validationDiagnostics = validateDocument(document, options);
  return {
    document,
    diagnostics: [...(document.diagnostics ?? []), ...validationDiagnostics],
  };
}

function extractDiagramDocument(value: unknown): DiagramDocument | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "function") {
    try {
      return extractDiagramDocument((value as () => unknown)());
    } catch {
      return undefined;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const doc = extractDiagramDocument(item);
      if (doc !== undefined) return doc;
    }
    return undefined;
  }

  if (isDiagramDocument(value)) {
    return value;
  }

  const maybe = value as { default?: unknown } | undefined;
  if (maybe?.default !== undefined) {
    return extractDiagramDocument(maybe.default);
  }

  return undefined;
}

export async function evaluateSource(sourceText: string, filePath: string): Promise<unknown> {
  if (!filePath) return undefined;

  const dir = dirname(filePath);
  const tmpPath = join(
    dir,
    `.drawspec-eval-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`
  );

  try {
    await Bun.write(tmpPath, sourceText);
    const mod = await import(tmpPath);
    return mod;
  } catch {
    return undefined;
  } finally {
    try {
      await Bun.file(tmpPath).unlink();
    } catch {}
  }
}

function isDiagramDocument(value: unknown): value is DiagramDocument {
  const maybe = value as Partial<DiagramDocument> | undefined;
  return (
    maybe?.schemaVersion !== undefined &&
    typeof maybe.id === "string" &&
    Array.isArray(maybe.nodes) &&
    Array.isArray(maybe.edges)
  );
}
