import type { Diagnostic, DiagnosticSeverity as DsSeverity } from "@drawspec/core";
import type { Diagnostic as LspDiagnosticType, Range } from "vscode-languageserver/node";

const severityMap: Record<DsSeverity, 1 | 2 | 3 | 4> = {
  error: 1,
  warning: 2,
  info: 3,
  hint: 4,
};

function makeRange(line: number, character: number): Range {
  return {
    start: { line, character },
    end: { line, character: character + 1 },
  };
}

const DEFAULT_RANGE: Range = makeRange(0, 0);

export function toLspDiagnostics(diagnostics: readonly Diagnostic[]): LspDiagnosticType[] {
  return diagnostics.map((diagnostic): LspDiagnosticType => {
    const range =
      diagnostic.source !== undefined
        ? makeRange(
            Math.max(0, diagnostic.source.line - 1),
            Math.max(0, diagnostic.source.column - 1)
          )
        : DEFAULT_RANGE;

    return {
      range,
      severity: severityMap[diagnostic.severity],
      code: diagnostic.code,
      source: "drawspec",
      message: diagnostic.message,
    };
  });
}
