import { describe, expect, test } from "bun:test";
import type { Position } from "vscode-languageserver/node";
import { provideHover } from "../hover";

const SEQUENCE_IMPORT = `import { sequence } from "@drawspec/uml-sequence";`;

function pos(line: number, character: number): Position {
  return { line, character };
}

describe("provideHover", () => {
  test("returns hover for factory function", () => {
    const text = [SEQUENCE_IMPORT, "", 'sequence("Test", (s) => {', "  s.actor('A');", "});"].join(
      "\n"
    );
    const hover = provideHover(text, pos(2, 1));
    expect(hover).toBeDefined();
    expect(hover?.contents).toBeDefined();
    const contents = hover?.contents as { kind: string; value: string };
    expect(contents.value).toContain("sequence");
    expect(contents.value).toContain("uml-sequence");
  });

  test("returns hover for builder method", () => {
    const text = [SEQUENCE_IMPORT, "", 'sequence("Test", (s) => {', "  s.actor('A');", "});"].join(
      "\n"
    );
    const hover = provideHover(text, pos(3, 4));
    expect(hover).toBeDefined();
    const contents = hover?.contents as { kind: string; value: string };
    expect(contents.value).toContain("actor");
    expect(contents.value).toContain("Add an actor participant");
  });

  test("returns hover for import line package", () => {
    const text = `import { sequence } from "@drawspec/uml-sequence";`;
    const hover = provideHover(text, pos(0, 35));
    expect(hover).toBeDefined();
    const contents = hover?.contents as { kind: string; value: string };
    expect(contents.value).toContain("@drawspec/uml-sequence");
  });

  test("returns undefined for unknown word", () => {
    const text = `const x = 42;`;
    const hover = provideHover(text, pos(0, 6));
    expect(hover).toBeUndefined();
  });

  test("returns hover for alt method in sequence", () => {
    const text = [
      SEQUENCE_IMPORT,
      "",
      'sequence("Test", (s) => {',
      "  const a = s.actor('A');",
      "  s.alt('cond', (s2) => {});",
      "});",
    ].join("\n");
    const hover = provideHover(text, pos(4, 4));
    expect(hover).toBeDefined();
    const contents = hover?.contents as { kind: string; value: string };
    expect(contents.value).toContain("alt");
    expect(contents.value).toContain("alt fragment");
  });
});
