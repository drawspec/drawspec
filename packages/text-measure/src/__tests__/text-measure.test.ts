import { describe, expect, test } from "bun:test";
import { CHARACTER_WIDTH_FACTORS, createTextMeasurer, measureText } from "../measure";
import { truncateText } from "../truncate";
import { wrapText } from "../wrap";

describe("measureText", () => {
  test("returns 0 for empty string", () => {
    expect(measureText("", 14)).toBe(0);
  });

  test("scales with fontSize", () => {
    const w10 = measureText("Hello", 10);
    const w20 = measureText("Hello", 20);
    expect(w20).toBeCloseTo(w10 * 2, 10);
  });

  test("uses CHARACTER_WIDTH_FACTORS for known characters", () => {
    const factor = CHARACTER_WIDTH_FACTORS["W"];
    if (factor === undefined) {
      throw new Error("Expected W to have a deterministic width factor");
    }
    expect(measureText("W", 10)).toBeCloseTo(factor * 10, 10);
  });

  test("uses 0.9 fallback for unknown characters", () => {
    expect(measureText("é", 10)).toBeCloseTo(0.9 * 10, 10);
  });

  test("CHARACTER_WIDTH_FACTORS is frozen", () => {
    expect(Object.isFrozen(CHARACTER_WIDTH_FACTORS)).toBe(true);
    expect(() => {
      (CHARACTER_WIDTH_FACTORS as Record<string, number>)["!"] = 999;
    }).toThrow();
  });
});

describe("createTextMeasurer", () => {
  test("returns an object with measure function", () => {
    const measurer = createTextMeasurer();
    expect(typeof measurer.measure).toBe("function");
  });

  test("measure delegates to measureText", () => {
    const measurer = createTextMeasurer();
    expect(measurer.measure("Hello", 14)).toBe(measureText("Hello", 14));
  });
});

describe("truncateText", () => {
  test("returns label unchanged when it fits", () => {
    const label = "Hi";
    const width = measureText(label, 14);
    expect(truncateText(label, width, 14)).toBe("Hi");
  });

  test("truncates with ellipsis when label exceeds maxWidth", () => {
    const label = "ExtremelyLongLabel";
    const maxWidth = 50;
    const result = truncateText(label, maxWidth, 14);
    expect(result).toContain("…");
    expect(measureText(result, 14)).toBeLessThanOrEqual(maxWidth);
  });

  test("returns ellipsis when maxWidth is smaller than ellipsis width", () => {
    const result = truncateText("Hello", 1, 14);
    expect(result).toBe("…");
  });

  test("preserves single character that fits", () => {
    const result = truncateText("A", measureText("A", 14) + 1, 14);
    expect(result).toBe("A");
  });

  test("handles empty string", () => {
    expect(truncateText("", 100, 14)).toBe("");
  });
});

describe("wrapText", () => {
  test("returns an empty array for empty input", () => {
    expect(wrapText("", 100, 14)).toEqual([]);
  });

  test("returns an empty array for whitespace-only input", () => {
    expect(wrapText("  \t\n  ", 100, 14)).toEqual([]);
  });

  test("keeps text on one line when it fits", () => {
    expect(wrapText("short label", measureText("short label", 14), 14)).toEqual(["short label"]);
  });

  test("wraps text at word boundaries", () => {
    const result = wrapText("alpha beta gamma", measureText("alpha beta", 14), 14);
    expect(result).toEqual(["alpha beta", "gamma"]);
  });

  test("keeps a single word wider than wrapWidth intact", () => {
    expect(wrapText("extraordinarilylongword", 10, 14)).toEqual(["extraordinarilylongword"]);
  });
});
