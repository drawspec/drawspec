import { describe, expect, test } from "bun:test";
import {
  escapeAttribute,
  escapeText,
  formatNumber,
  measureText,
  renderAttributes,
  renderElement,
  stableSvgId,
} from "../index";
import { compareStable } from "../svg";

// ─── escapeText ────────────────────────────────────────────────────────────────

describe("escapeText", () => {
  test("escapes ampersand", () => {
    expect(escapeText("a&b")).toBe("a&amp;b");
  });

  test("escapes less-than", () => {
    expect(escapeText("a<b")).toBe("a&lt;b");
  });

  test("escapes greater-than", () => {
    expect(escapeText("a>b")).toBe("a&gt;b");
  });

  test("escapes all three XML special characters in one string", () => {
    expect(escapeText("<&>")).toBe("&lt;&amp;&gt;");
  });

  test("returns empty string unchanged", () => {
    expect(escapeText("")).toBe("");
  });

  test("does not escape double quotes", () => {
    expect(escapeText('a"b')).toBe('a"b');
  });

  test("does not escape single quotes", () => {
    expect(escapeText("a'b")).toBe("a'b");
  });

  test("preserves unicode characters", () => {
    expect(escapeText("日本語")).toBe("日本語");
  });

  test("preserves newlines", () => {
    expect(escapeText("line1\nline2")).toBe("line1\nline2");
  });

  test("preserves plain text without special characters", () => {
    expect(escapeText("Hello World")).toBe("Hello World");
  });

  test("escapes multiple ampersands", () => {
    expect(escapeText("&amp;")).toBe("&amp;amp;");
  });
});

// ─── escapeAttribute ───────────────────────────────────────────────────────────

describe("escapeAttribute", () => {
  test("escapes double quotes", () => {
    expect(escapeAttribute('val"ue')).toBe("val&quot;ue");
  });

  test("escapes ampersands in attribute values", () => {
    expect(escapeAttribute("a&b")).toBe("a&amp;b");
  });

  test("escapes less-than in attribute values", () => {
    expect(escapeAttribute("a<b")).toBe("a&lt;b");
  });

  test("escapes greater-than in attribute values", () => {
    expect(escapeAttribute("a>b")).toBe("a&gt;b");
  });

  test("escapes combination of quotes and XML chars", () => {
    expect(escapeAttribute('<"">&>')).toBe("&lt;&quot;&quot;&gt;&amp;&gt;");
  });

  test("preserves plain attribute value", () => {
    expect(escapeAttribute("hello")).toBe("hello");
  });
});

// ─── formatNumber ──────────────────────────────────────────────────────────────

describe("formatNumber", () => {
  test("formats integer 5 as '5'", () => {
    expect(formatNumber(5)).toBe("5");
  });

  test("formats decimal 3.14 as '3.14'", () => {
    expect(formatNumber(3.14)).toBe("3.14");
  });

  test("formats zero as '0'", () => {
    expect(formatNumber(0)).toBe("0");
  });

  test("formats negative number -5 as '-5'", () => {
    expect(formatNumber(-5)).toBe("-5");
  });

  test("formats large number without scientific notation", () => {
    expect(formatNumber(1000000)).toBe("1000000");
  });

  test("rounds to 3 decimal places", () => {
    expect(formatNumber(1.23456)).toBe("1.235");
  });

  test("converts negative zero to '0'", () => {
    expect(formatNumber(-0)).toBe("0");
  });

  test("throws for Infinity", () => {
    expect(() => formatNumber(Infinity)).toThrow("non-finite");
  });

  test("throws for NaN", () => {
    expect(() => formatNumber(NaN)).toThrow("non-finite");
  });

  test("throws for -Infinity", () => {
    expect(() => formatNumber(-Infinity)).toThrow("non-finite");
  });

  test("formats very small decimal", () => {
    expect(formatNumber(0.001)).toBe("0.001");
  });

  test("formats negative decimal", () => {
    expect(formatNumber(-3.14)).toBe("-3.14");
  });
});

// ─── renderAttributes ──────────────────────────────────────────────────────────

describe("renderAttributes", () => {
  test("returns empty string for empty object", () => {
    expect(renderAttributes({})).toBe("");
  });

  test("renders a single attribute", () => {
    expect(renderAttributes({ fill: "red" })).toBe('fill="red"');
  });

  test("renders multiple attributes in sorted order", () => {
    const result = renderAttributes({ fill: "red", stroke: "blue", width: 100 });
    expect(result).toBe('fill="red" stroke="blue" width="100"');
  });

  test("skips undefined values", () => {
    const result = renderAttributes({ fill: "red", stroke: undefined });
    expect(result).toBe('fill="red"');
  });

  test("skips false boolean values", () => {
    const result = renderAttributes({ visible: false, fill: "red" });
    expect(result).toBe('fill="red"');
  });

  test("renders true boolean as 'true'", () => {
    const result = renderAttributes({ visible: true });
    expect(result).toBe('visible="true"');
  });

  test("renders numeric values via formatNumber", () => {
    const result = renderAttributes({ width: Math.PI });
    expect(result).toBe('width="3.142"');
  });

  test("escapes special characters in attribute values", () => {
    const result = renderAttributes({ label: 'a"b&c' });
    expect(result).toBe('label="a&quot;b&amp;c"');
  });

  test("sorts attributes deterministically", () => {
    const attrs = { z: "1", a: "2", m: "3" };
    const result = renderAttributes(attrs);
    const keys = result.split(" ").map((pair) => pair.split("=")[0]);
    expect(keys).toEqual(["a", "m", "z"]);
  });
});

// ─── stableSvgId ───────────────────────────────────────────────────────────────

describe("stableSvgId", () => {
  test("returns same output for same input", () => {
    const first = stableSvgId("drawspec", "node", "abc");
    const second = stableSvgId("drawspec", "node", "abc");
    expect(first).toBe(second);
  });

  test("returns different output for different input", () => {
    const a = stableSvgId("drawspec", "node", "abc");
    const b = stableSvgId("drawspec", "node", "xyz");
    expect(a).not.toBe(b);
  });

  test("produces a slug with only safe characters", () => {
    const id = stableSvgId("prefix", "Hello World!", "test");
    expect(id).toMatch(/^[a-z0-9_-]+-[a-z0-9]+$/);
  });

  test("includes a hash suffix for uniqueness", () => {
    const id = stableSvgId("test");
    const parts = id.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(2);
    const hash = parts[parts.length - 1];
    expect(hash.length).toBe(7);
  });

  test("is deterministic across calls", () => {
    const id1 = stableSvgId("drawspec", "My Doc");
    const id2 = stableSvgId("drawspec", "My Doc");
    expect(id1).toBe(id2);
  });

  test("lowercases the slug portion", () => {
    const id = stableSvgId("PREFIX", "CamelCase");
    const hashSuffix = id.lastIndexOf("-");
    const slug = id.substring(0, hashSuffix);
    expect(slug).toBe(slug.toLowerCase());
  });
});

// ─── renderElement ─────────────────────────────────────────────────────────────

describe("renderElement", () => {
  test("renders self-closing element", () => {
    const result = renderElement({ name: "rect", selfClosing: true });
    expect(result).toBe("<rect />");
  });

  test("renders element with attributes", () => {
    const result = renderElement({
      name: "rect",
      attrs: { width: 100, height: 50 },
      selfClosing: true,
    });
    expect(result).toBe('<rect height="50" width="100" />');
  });

  test("renders element with text child", () => {
    const result = renderElement({ name: "text", children: ["Hello"] });
    expect(result).toContain("Hello");
    expect(result).toContain("<text>");
    expect(result).toContain("</text>");
  });

  test("renders element with nested child", () => {
    const result = renderElement({
      name: "g",
      children: [{ name: "rect", selfClosing: true }],
    });
    expect(result).toContain("<g>");
    expect(result).toContain("<rect />");
    expect(result).toContain("</g>");
  });

  test("escapes text content", () => {
    const result = renderElement({ name: "text", children: ["<script>alert('x')</script>"] });
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });
});

// ─── compareStable ─────────────────────────────────────────────────────────────

describe("compareStable", () => {
  test("returns -1 when left < right", () => {
    expect(compareStable("a", "b")).toBe(-1);
  });

  test("returns 1 when left > right", () => {
    expect(compareStable("b", "a")).toBe(1);
  });

  test("returns 0 when equal", () => {
    expect(compareStable("same", "same")).toBe(0);
  });
});

// ─── measureText ───────────────────────────────────────────────────────────────

describe("measureText", () => {
  test("returns zero for empty string", () => {
    expect(measureText("", 14)).toBe(0);
  });

  test("measures narrow characters smaller than wide characters", () => {
    expect(measureText("iiii", 10)).toBeLessThan(measureText("WWWW", 10));
  });

  test("scales with font size", () => {
    const small = measureText("test", 10);
    const large = measureText("test", 20);
    expect(large).toBe(small * 2);
  });
});
