import { describe, expect, test } from "bun:test";
import { sequence } from "@drawspec/uml-sequence";
import { recommendedRules, validate } from "@drawspec/validation";
import {
  compileDiagram,
  expectDiagram,
  expectValid,
  expectViolation,
  renderFixture,
  stableIrJson,
} from "../index";

describe("@drawspec/testkit", () => {
  const diagram = sequence("Test payment", (seq) => {
    const user = seq.actor("User");
    const shop = seq.participant("Shop");
    user.to(shop, "Checkout");
  });

  test("compiles diagram modules and exposes fluent assertions", async () => {
    const compiled = await compileDiagram({ default: diagram });

    expectDiagram(compiled).toHaveNode("User").toHaveNode("Shop").toHaveEdge("Checkout");
  });

  test("renders deterministic SVG fixtures", async () => {
    const first = await renderFixture(diagram);
    const second = await renderFixture(diagram);

    expect(first).toBe(second);
    expect(first).toContain("Test payment");
  });

  test("serializes stable IR JSON", () => {
    expect(stableIrJson(diagram)).toEndWith("\n");
    expect(stableIrJson(diagram)).toBe(stableIrJson({ ...diagram }));
  });

  test("asserts validation results", () => {
    expectValid(validate({ diagram, rules: recommendedRules }));
    expectViolation(
      validate({ diagram: { ...diagram, title: "" }, rules: recommendedRules }),
      "diagram/require-title"
    );
  });
});
