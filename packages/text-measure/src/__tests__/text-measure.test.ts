import { describe, expect, test } from "bun:test";
import {
  CHARACTER_WIDTH_FACTORS,
  createTextMeasurer,
  measureRichText,
  measureText,
  measureTextContent,
  type RichText,
} from "../measure";
import { truncateRichText, truncateText } from "../truncate";
import { wrapRichText, wrapText } from "../wrap";

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

  test("measure supports rich text content", () => {
    const measurer = createTextMeasurer();
    const label: RichText = [
      { text: "API", bold: true },
      { text: " `code`", code: true },
    ];
    expect(measurer.measure(label, 14)).toBe(measureTextContent(label, 14));
  });
});

describe("measureRichText", () => {
  test("sums segment widths", () => {
    const label: RichText = [{ text: "alpha" }, { text: " beta" }];
    expect(measureRichText(label, 14)).toBeCloseTo(measureText("alpha beta", 14), 10);
  });

  test("bold text is wider than regular text", () => {
    expect(measureRichText([{ text: "bold", bold: true }], 14)).toBeGreaterThan(
      measureText("bold", 14)
    );
  });

  test("code text uses deterministic monospace metrics", () => {
    const regular = measureText("iiii", 14);
    const code = measureRichText([{ text: "iiii", code: true }], 14);
    expect(code).toBeGreaterThan(regular);
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

describe("truncateRichText", () => {
  test("preserves formatting while truncating", () => {
    const result = truncateRichText([{ text: "ExtremelyLongLabel", bold: true }], 50, 14);
    expect(result.at(0)?.bold).toBe(true);
    expect(result.at(-1)?.text).toBe("…");
    expect(measureRichText(result, 14)).toBeLessThanOrEqual(50);
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

describe("wrapRichText", () => {
  test("wraps mixed formatting at word boundaries", () => {
    const label: RichText = [
      { text: "alpha ", bold: true },
      { text: "beta gamma", code: true },
    ];
    const lines = wrapRichText(
      label,
      measureRichText(
        [
          { text: "alpha ", bold: true },
          { text: "beta", code: true },
        ],
        14
      ),
      14
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]?.map((segment) => segment.text).join("")).toBe("alpha beta");
  });

  test("does not introduce spaces at segment boundaries inside a word", () => {
    const lines = wrapRichText([{ text: "inter", bold: true }, { text: "face" }], 500, 14);
    expect(lines[0]?.map((segment) => segment.text).join("")).toBe("interface");
  });
});
