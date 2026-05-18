import type { SourceRef } from "./types";

export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  source?: SourceRef;
  target?: string;
  help?: string;
}

export interface DiagnosticInput {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  source?: SourceRef;
  target?: string;
  help?: string;
}

export const DiagnosticCode = {
  IdCollision: "DS_CORE_ID_COLLISION",
  InvalidReference: "DS_CORE_INVALID_REFERENCE",
  SerializationFailed: "DS_CORE_SERIALIZATION_FAILED",
} as const;

export function createDiagnostic(input: DiagnosticInput): Diagnostic {
  return { ...input };
}

export function createIdCollisionDiagnostic(id: string): Diagnostic {
  return createDiagnostic({
    code: DiagnosticCode.IdCollision,
    severity: "error",
    message: `Duplicate diagram element ID: ${id}`,
    target: id,
    help: "IDs must be unique within a diagram document.",
  });
}
