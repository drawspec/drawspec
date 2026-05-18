import { architectureRules } from "./rules/architecture";
import { diagramRules } from "./rules/diagram";
import type { Rule, RuleConfig, ValidationConfig } from "./types";

export const recommendedRules = [
  ...architectureRules,
  ...diagramRules,
] as const satisfies readonly Rule[];

export const recommended: ValidationConfig = {
  rules: Object.fromEntries(
    recommendedRules
      .filter((rule) => rule.meta.recommended !== false)
      .map((rule) => [rule.name, rule.meta.defaultSeverity ?? "error"])
  ) as RuleConfig,
};
