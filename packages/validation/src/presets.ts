import { architectureRules } from "./rules/architecture";
import { diagramRules } from "./rules/diagram";
import type { Rule, RuleConfig, ValidationConfig } from "./types";

export const recommendedRules = [
  ...architectureRules,
  ...diagramRules,
] as const satisfies readonly Rule[];

// Assert no duplicate rule names before building the config.
const nameCount = new Map<string, number>();
for (const rule of recommendedRules) {
  const n = (nameCount.get(rule.name) ?? 0) + 1;
  nameCount.set(rule.name, n);
}
for (const [name, n] of nameCount) {
  if (n > 1) {
    throw new Error(`Duplicate rule name '${name}' found in recommended rules.`);
  }
}

export const recommended: ValidationConfig = {
  rules: Object.fromEntries(
    recommendedRules
      .filter((rule) => rule.meta.recommended !== false)
      .map((rule) => [rule.name, rule.meta.defaultSeverity ?? "error"])
  ) as RuleConfig,
};
