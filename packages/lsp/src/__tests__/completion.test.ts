import { describe, expect, test } from "bun:test";
import type { Position } from "vscode-languageserver/node";
import { detectCompletionContext, provideCompletionList, provideCompletions } from "../completion";

const SEQUENCE_IMPORT = `import { sequence } from "@drawspec/uml-sequence";`;
const CLASS_IMPORT = `import { classDiagram } from "@drawspec/uml-class";`;
const COMPONENT_IMPORT = `import { componentDiagram } from "@drawspec/uml-component";`;

function pos(line: number, character: number): Position {
  return { line, character };
}

describe("detectCompletionContext", () => {
  test("detects package specifier context", () => {
    const text = `import { sequence } from "@drawspec/"`;
    const ctx = detectCompletionContext(text, pos(0, 38));
    expect(ctx.inPackageSpecifier).toBe(true);
    expect(ctx.inImport).toBe(true);
  });

  test("detects non-import top-level context", () => {
    const text = `${SEQUENCE_IMPORT}\n\nsequence("Test");`;
    const ctx = detectCompletionContext(text, pos(2, 5));
    expect(ctx.topLevel).toBe(true);
    expect(ctx.inImport).toBe(false);
    expect(ctx.inBuilderCallback).toBe(false);
  });

  test("detects builder callback context from imports", () => {
    const text = [SEQUENCE_IMPORT, "", 'sequence("Test", (s) => {', "  s.act", "});"].join("\n");
    const ctx = detectCompletionContext(text, pos(3, 5));
    expect(ctx.inBuilderCallback).toBe(true);
    expect(ctx.detectedPackage?.factoryFunction).toBe("sequence");
    expect(ctx.builderParamName).toBe("s");
  });

  test("detects class diagram builder context", () => {
    const text = [CLASS_IMPORT, "", 'classDiagram("My Classes", (d) => {', "  d.clas", "});"].join(
      "\n"
    );
    const ctx = detectCompletionContext(text, pos(3, 8));
    expect(ctx.inBuilderCallback).toBe(true);
    expect(ctx.detectedPackage?.factoryFunction).toBe("classDiagram");
  });
});

describe("provideCompletions", () => {
  test("provides package completions for import specifier", () => {
    const text = `import { sequence } from "@drawspec/"`;
    const items = provideCompletions(text, pos(0, 38));
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("@drawspec/uml-sequence");
    expect(labels).toContain("@drawspec/uml-class");
    expect(labels).toContain("@drawspec/architecture");
  });

  test("provides builder method completions for sequence", () => {
    const text = [SEQUENCE_IMPORT, "", 'sequence("Test", (s) => {', "  s.", "});"].join("\n");
    const items = provideCompletions(text, pos(3, 4));
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("actor");
    expect(labels).toContain("participant");
    expect(labels).toContain("message");
    expect(labels).toContain("alt");
  });

  test("provides builder method completions for class diagram", () => {
    const text = [CLASS_IMPORT, "", 'classDiagram("My Classes", (d) => {', "  d.", "});"].join(
      "\n"
    );
    const items = provideCompletions(text, pos(3, 4));
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("class_");
    expect(labels).toContain("interface_");
    expect(labels).toContain("enum_");
    expect(labels).toContain("implements");
    expect(labels).toContain("uses");
  });

  test("provides builder method completions for component diagram", () => {
    const text = [COMPONENT_IMPORT, "", 'componentDiagram("System", (d) => {', "  d.", "});"].join(
      "\n"
    );
    const items = provideCompletions(text, pos(3, 4));
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("component");
    expect(labels).toContain("dependency");
  });

  test("provides factory function completions at top level", () => {
    const text = `${SEQUENCE_IMPORT}\n\nseq`;
    const items = provideCompletions(text, pos(2, 3));
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("sequence");
    expect(labels).toContain("classDiagram");
    expect(labels).toContain("stateDiagram");
  });

  test("returns empty when cursor is at empty position with no prefix", () => {
    const text = `const x = 42;\n\n   \n`;
    const items = provideCompletions(text, pos(2, 3));
    expect(items).toHaveLength(0);
  });
});

describe("provideCompletionList", () => {
  test("returns a CompletionList with isIncomplete", () => {
    const text = `${SEQUENCE_IMPORT}\n\nseq`;
    const list = provideCompletionList(text, pos(2, 3));
    expect(list.isIncomplete).toBe(false);
    expect(list.items.length).toBeGreaterThan(0);
  });
});
