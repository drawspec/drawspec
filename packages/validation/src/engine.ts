import type { Diagnostic } from "@drawspec/core";
import type {
  DiagnosticInput,
  DiagnosticSeverity,
  Rule,
  RuleConfigContext,
  RuleConfigEntry,
  RuleSeverity,
  ValidationConfig,
  ValidationInput,
  ValidationResult,
} from "./types";

const severityMap: Record<Exclude<RuleSeverity, "off">, DiagnosticSeverity> = {
  error: "error",
  info: "info",
  warn: "warning",
};

export function normalizeRuleConfig<Options>(
  rule: Rule<Options>,
  config: ValidationConfig | undefined
): RuleConfigContext<Options> | undefined {
  const entry = config?.rules?.[rule.name] as RuleConfigEntry<Options> | undefined;
  const fallback = rule.meta.defaultSeverity ?? (rule.meta.recommended === false ? "off" : "error");
  const severity = Array.isArray(entry) ? entry[0] : (entry ?? fallback);

  if (severity === "off") {
    return undefined;
  }

  return {
    severity,
    diagnosticSeverity: severityMap[severity],
    options: Array.isArray(entry) ? entry[1] : undefined,
  };
}

export function targetToString(target: DiagnosticInput["target"]): string | undefined {
  if (target === undefined) {
    return undefined;
  }
  if (typeof target === "string") {
    return target;
  }
  return `${target.kind}:${target.id}`;
}

export class RuleEngine {
  readonly #rules: readonly Rule[];

  constructor(rules: readonly Rule[]) {
    this.#rules = [...rules].sort((left, right) => left.name.localeCompare(right.name));
  }

  validate(input: ValidationInput): ValidationResult {
    const diagnostics: Diagnostic[] = [];

    for (const rule of this.#rules) {
      const ruleConfig = normalizeRuleConfig(rule, input.config);
      if (ruleConfig === undefined) {
        continue;
      }

      const context = {
        config: ruleConfig,
        report: (diagnostic: DiagnosticInput) => {
          const target = targetToString(diagnostic.target);
          diagnostics.push({
            code: rule.name,
            severity: ruleConfig.diagnosticSeverity,
            message: diagnostic.message,
            ...(diagnostic.source === undefined ? {} : { source: diagnostic.source }),
            ...(target === undefined ? {} : { target }),
            ...(diagnostic.help === undefined ? {} : { help: diagnostic.help }),
          });
        },
        ...(input.model === undefined ? {} : { model: input.model }),
        ...(input.diagram === undefined ? {} : { diagram: input.diagram }),
      };

      const visitor = rule.create(context);

      if (visitor === undefined) {
        continue;
      }

      if (input.model !== undefined) {
        visitor.architectureModel?.(input.model);
        for (const element of input.model.elements) {
          visitor.architectureElement?.(element);
        }
        for (const relationship of input.model.relationships) {
          visitor.architectureRelationship?.(relationship);
        }
      }

      if (input.diagram !== undefined) {
        visitor.diagram?.(input.diagram);
        for (const node of input.diagram.nodes) {
          visitor.diagramNode?.(node, input.diagram);
        }
        for (const edge of input.diagram.edges) {
          visitor.diagramEdge?.(edge, input.diagram);
        }
      }
    }

    return { diagnostics };
  }
}

export function validate(
  input: ValidationInput & { readonly rules: readonly Rule[] }
): ValidationResult {
  return new RuleEngine(input.rules).validate(input);
}
