import { describe, expect, test } from "bun:test";
import type { Position } from "vscode-languageserver/node";
import { provideDefinition } from "../definition";

const SEQUENCE_IMPORT = `import { sequence } from "@drawspec/uml-sequence";`;

function pos(line: number, character: number): Position {
  return { line, character };
}

describe("provideDefinition", () => {
  test("resolves import to package entry point", () => {
    const text = SEQUENCE_IMPORT;
    const defs = provideDefinition("file:///tmp/test.seq.ts", text, pos(0, 32), "/project");
    expect(defs.length).toBe(1);
    expect(defs[0]?.targetUri).toContain("uml-sequence");
    expect(defs[0]?.targetUri).toContain("index.ts");
  });

  test("resolves @diagram reference", () => {
    const text = ["/**", " * @diagram ./hello.seq.ts", " */"].join("\n");
    const defs = provideDefinition("file:///tmp/test.doc.ts", text, pos(1, 20), undefined);
    expect(defs.length).toBe(1);
    expect(defs[0]?.targetUri).toContain("hello.seq.ts");
  });

  test("resolves factory function call to package entry", () => {
    const text = [SEQUENCE_IMPORT, "", 'sequence("Test", (s) => {', "  s.actor('A');", "});"].join(
      "\n"
    );
    const defs = provideDefinition("file:///tmp/test.seq.ts", text, pos(2, 1), "/project");
    expect(defs.length).toBe(1);
    expect(defs[0]?.targetUri).toContain("uml-sequence");
  });

  test("resolves aliased factory function", () => {
    const text = [
      `import { sequence as seq } from "@drawspec/uml-sequence";`,
      "",
      'seq("Test", (s) => {',
      "  s.actor('A');",
      "});",
    ].join("\n");
    const defs = provideDefinition("file:///tmp/test.seq.ts", text, pos(2, 1), "/project");
    expect(defs.length).toBe(1);
    expect(defs[0]?.targetUri).toContain("uml-sequence");
  });

  test("returns empty for unknown position", () => {
    const text = `const x = 42;`;
    const defs = provideDefinition("file:///tmp/test.ts", text, pos(0, 6), "/project");
    expect(defs).toHaveLength(0);
  });

  test("returns empty when cursor is not on import string", () => {
    const text = SEQUENCE_IMPORT;
    const defs = provideDefinition("file:///tmp/test.ts", text, pos(0, 5), "/project");
    expect(defs).toHaveLength(0);
  });
});
