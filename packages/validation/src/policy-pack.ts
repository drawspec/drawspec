import { recommendedRules } from "./presets";
import type { PolicyPack, RuleConfig } from "./types";

const policyPacks = new Map<string, PolicyPack>();

const builtinRecommended: PolicyPack = {
  name: "recommended",
  description: "Default recommended policy with all recommended rules at their default severity",
  rules: Object.fromEntries(
    recommendedRules
      .filter((rule) => rule.meta.recommended !== false)
      .map((rule) => [rule.name, rule.meta.defaultSeverity ?? "error"])
  ) as RuleConfig,
};

policyPacks.set(builtinRecommended.name, builtinRecommended);

const builtinStrict: PolicyPack = {
  name: "strict",
  description: "Strict policy that elevates all warnings to errors",
  rules: Object.fromEntries(
    recommendedRules
      .filter((rule) => rule.meta.recommended !== false)
      .map((rule) => [rule.name, "error"])
  ) as RuleConfig,
};

policyPacks.set(builtinStrict.name, builtinStrict);

const builtinRelaxed: PolicyPack = {
  name: "relaxed",
  description: "Relaxed policy that demotes all rules to warnings",
  rules: Object.fromEntries(
    recommendedRules
      .filter((rule) => rule.meta.recommended !== false)
      .map((rule) => [rule.name, "warn"])
  ) as RuleConfig,
};

policyPacks.set(builtinRelaxed.name, builtinRelaxed);

export function registerPolicyPack(pack: PolicyPack): void {
  if (policyPacks.has(pack.name)) {
    throw new Error(`Policy pack '${pack.name}' is already registered.`);
  }
  policyPacks.set(pack.name, pack);
}

export function loadPolicyPack(name: string): PolicyPack {
  const pack = policyPacks.get(name);
  if (pack === undefined) {
    const available = [...policyPacks.keys()].sort().join(", ");
    throw new Error(`Unknown policy pack '${name}'. Available packs: ${available}`);
  }
  return pack;
}

export function listPolicyPacks(): readonly PolicyPack[] {
  return [...policyPacks.values()].sort((a, b) => a.name.localeCompare(b.name));
}
