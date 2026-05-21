import { describe, expect, test } from "bun:test";
import {
  listPolicyPacks,
  loadPolicyPack,
  RuleEngine,
  recommendedRules,
  registerPolicyPack,
} from "../index";
import type { PolicyPack, RuleConfig } from "../types";

describe("policy packs", () => {
  test("loadPolicyPack returns the built-in recommended pack", () => {
    const pack = loadPolicyPack("recommended");
    expect(pack.name).toBe("recommended");
    expect(pack.description).toBeTruthy();
    expect(pack.rules).toBeDefined();
  });

  test("loadPolicyPack returns the built-in strict pack", () => {
    const pack = loadPolicyPack("strict");
    expect(pack.name).toBe("strict");
    for (const rule of recommendedRules) {
      if (rule.meta.recommended !== false) {
        expect(pack.rules[rule.name]).toBe("error");
      }
    }
  });

  test("loadPolicyPack returns the built-in relaxed pack", () => {
    const pack = loadPolicyPack("relaxed");
    expect(pack.name).toBe("relaxed");
    for (const rule of recommendedRules) {
      if (rule.meta.recommended !== false) {
        expect(pack.rules[rule.name]).toBe("warn");
      }
    }
  });

  test("loadPolicyPack throws for unknown pack name", () => {
    expect(() => loadPolicyPack("nonexistent")).toThrow("Unknown policy pack 'nonexistent'");
  });

  test("loadPolicyPack error lists available packs", () => {
    try {
      loadPolicyPack("bogus");
    } catch (err) {
      expect((err as Error).message).toContain("recommended");
      expect((err as Error).message).toContain("strict");
      expect((err as Error).message).toContain("relaxed");
    }
  });

  test("registerPolicyPack adds a custom pack", () => {
    const customRules: RuleConfig = { "diagram/require-title": "warn" };
    const custom: PolicyPack = {
      name: "custom-test-pack",
      description: "Test pack",
      rules: customRules,
    };
    registerPolicyPack(custom);
    const loaded = loadPolicyPack("custom-test-pack");
    expect(loaded.name).toBe("custom-test-pack");
    expect(loaded.rules["diagram/require-title"]).toBe("warn");
  });

  test("registerPolicyPack rejects duplicate names", () => {
    const pack: PolicyPack = { name: "dup-test", description: "First", rules: {} };
    registerPolicyPack(pack);
    const dup: PolicyPack = { name: "dup-test", description: "Second", rules: {} };
    expect(() => registerPolicyPack(dup)).toThrow("already registered");
  });

  test("listPolicyPacks returns all registered packs sorted by name", () => {
    const names = listPolicyPacks().map((p) => p.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
    expect(names).toContain("recommended");
    expect(names).toContain("strict");
    expect(names).toContain("relaxed");
  });

  test("policy pack overrides rule severities in engine", () => {
    const strictPack = loadPolicyPack("strict");
    const doc = {
      schemaVersion: "1.0.0" as const,
      id: "test",
      kind: "sequence" as const,
      nodes: [],
      edges: [],
      groups: [],
      annotations: [],
    };
    const result = new RuleEngine(recommendedRules).validate({
      diagram: doc,
      config: { rules: strictPack.rules },
    });
    for (const diagnostic of result.diagnostics) {
      expect(diagnostic.severity).toBe("error");
    }
  });
});
