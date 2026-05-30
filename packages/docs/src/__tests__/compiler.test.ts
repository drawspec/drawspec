import { describe, expect, test } from "bun:test";
import { compileDoc } from "../compiler";
import { defineDoc } from "../define-doc";

describe("compileDoc", () => {
  test("compiles a simple document", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "Hello" }],
        },
      ],
    });

    const compiled = await compileDoc(doc);
    expect(compiled.resolved).toBe(true);
    expect(compiled.diagnostics).toHaveLength(0);
    expect(compiled.title).toBe("Test");
  });

  test("resolves code block source file", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "codeBlock",
          lang: "ts",
          source: "./example.ts",
          value: "// placeholder",
        },
      ],
    });

    const compiled = await compileDoc(doc, {
      readFile: async (path) => `// Content of ${path}`,
    });

    expect(compiled.diagnostics).toHaveLength(0);
    const code = compiled.content[0];
    if (code.type === "codeBlock") {
      expect(code.value).toBe("// Content of ./example.ts");
    }
  });

  test("reports diagnostic when source file read fails", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "codeBlock",
          lang: "ts",
          source: "./missing.ts",
          value: "// original",
        },
      ],
    });

    const compiled = await compileDoc(doc, {
      readFile: async () => {
        throw new Error("File not found");
      },
    });

    expect(compiled.diagnostics).toHaveLength(1);
    expect(compiled.diagnostics[0].severity).toBe("error");
    expect(compiled.diagnostics[0].message).toContain("missing.ts");
    // Original value preserved on error
    const code = compiled.content[0];
    if (code.type === "codeBlock") {
      expect(code.value).toBe("// original");
    }
  });

  test("passes through blocks without external references", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "heading",
          level: 1,
          children: [{ type: "text", value: "Title" }],
        },
        {
          type: "divider",
        },
        {
          type: "paragraph",
          children: [{ type: "text", value: "Text" }],
        },
      ],
    });

    const compiled = await compileDoc(doc);
    expect(compiled.content).toHaveLength(3);
    expect(compiled.diagnostics).toHaveLength(0);
  });

  test("resolves nested blockquote content", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "blockquote",
          children: [
            {
              type: "codeBlock",
              lang: "ts",
              source: "./quoted-code.ts",
              value: "// original",
            },
          ],
        },
      ],
    });

    const compiled = await compileDoc(doc, {
      readFile: async (path) => `// Resolved: ${path}`,
    });

    const bq = compiled.content[0];
    if (bq.type === "blockquote") {
      const code = bq.children[0];
      if (code.type === "codeBlock") {
        expect(code.value).toBe("// Resolved: ./quoted-code.ts");
      }
    }
  });

  test("resolves nested list content", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "list",
          kind: "unordered",
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "codeBlock",
                  lang: "ts",
                  source: "./item-code.ts",
                  value: "// original",
                },
              ],
            },
          ],
        },
      ],
    });

    const compiled = await compileDoc(doc, {
      readFile: async (path) => `// Item: ${path}`,
    });

    const list = compiled.content[0];
    if (list.type === "list") {
      const code = list.children[0].children[0];
      if (code.type === "codeBlock") {
        expect(code.value).toBe("// Item: ./item-code.ts");
      }
    }
  });

  test("resolves nested tab group content", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "tabGroup",
          children: [
            {
              type: "tabItem",
              label: "Tab 1",
              children: [
                {
                  type: "codeBlock",
                  lang: "ts",
                  source: "./tab1.ts",
                  value: "// original",
                },
              ],
            },
          ],
        },
      ],
    });

    const compiled = await compileDoc(doc, {
      readFile: async (path) => `// Tab: ${path}`,
    });

    const tabs = compiled.content[0];
    if (tabs.type === "tabGroup") {
      const code = tabs.children[0].children[0];
      if (code.type === "codeBlock") {
        expect(code.value).toBe("// Tab: ./tab1.ts");
      }
    }
  });

  test("preserves diagram references", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "diagram",
          ref: "./overview.arch.ts",
          caption: "Overview",
        },
      ],
    });

    const compiled = await compileDoc(doc);
    const diagram = compiled.content[0];
    if (diagram.type === "diagram") {
      expect(diagram.ref).toBe("./overview.arch.ts");
      expect(diagram.caption).toBe("Overview");
    }
  });

  test("works with empty content", async () => {
    const doc = defineDoc({
      title: "Empty",
      content: [],
    });

    const compiled = await compileDoc(doc);
    expect(compiled.content).toHaveLength(0);
    expect(compiled.diagnostics).toHaveLength(0);
  });
});
