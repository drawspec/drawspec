import { describe, expect, test } from "bun:test";
import { defineDoc } from "../define-doc";
import type { DocBlock } from "../types";

describe("defineDoc", () => {
  test("creates a document with a title and paragraph", () => {
    const doc = defineDoc({
      title: "Test Doc",
      content: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "Hello, world!" }],
        },
      ],
    });

    expect(doc.schemaVersion).toBe("0.1.0");
    expect(doc.title).toBe("Test Doc");
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0].type).toBe("paragraph");
  });

  test("creates a document with a heading", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "heading",
          level: 2,
          children: [{ type: "text", value: "Section" }],
        },
      ],
    });

    const heading = doc.content[0];
    expect(heading.type).toBe("heading");
    if (heading.type === "heading") {
      expect(heading.level).toBe(2);
      expect(heading.children[0].type).toBe("text");
    }
  });

  test("creates a document with a code block", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "codeBlock",
          lang: "typescript",
          value: 'console.log("hello")',
        },
      ],
    });

    const code = doc.content[0];
    expect(code.type).toBe("codeBlock");
    if (code.type === "codeBlock") {
      expect(code.lang).toBe("typescript");
      expect(code.value).toBe('console.log("hello")');
    }
  });

  test("creates a document with a code block with source reference", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "codeBlock",
          lang: "ts",
          source: "./examples/example.ts",
          value: "// placeholder",
        },
      ],
    });

    const code = doc.content[0];
    expect(code.type).toBe("codeBlock");
    if (code.type === "codeBlock") {
      expect(code.source).toBe("./examples/example.ts");
    }
  });

  test("creates a document with a diagram reference", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "diagram",
          ref: "./overview.arch.ts",
          caption: "System overview",
        },
      ],
    });

    const diagram = doc.content[0];
    expect(diagram.type).toBe("diagram");
    if (diagram.type === "diagram") {
      expect(diagram.ref).toBe("./overview.arch.ts");
      expect(diagram.caption).toBe("System overview");
    }
  });

  test("creates a document with a callout", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "callout",
          kind: "tip",
          title: "Pro tip",
          children: [{ type: "text", value: "Use hotkeys!" }],
        },
      ],
    });

    const callout = doc.content[0];
    expect(callout.type).toBe("callout");
    if (callout.type === "callout") {
      expect(callout.kind).toBe("tip");
      expect(callout.title).toBe("Pro tip");
    }
  });

  test("creates a document with a link block", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "linkBlock",
          href: "./next-page.doc.ts",
          label: "Next →",
          description: "Continue reading",
        },
      ],
    });

    const link = doc.content[0];
    expect(link.type).toBe("linkBlock");
    if (link.type === "linkBlock") {
      expect(link.href).toBe("./next-page.doc.ts");
      expect(link.label).toBe("Next →");
      expect(link.description).toBe("Continue reading");
    }
  });

  test("creates a document with a list", () => {
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
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const list = doc.content[0];
    expect(list.type).toBe("list");
    if (list.type === "list") {
      expect(list.kind).toBe("unordered");
      expect(list.children).toHaveLength(2);
    }
  });

  test("creates a document with an ordered list with start", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "list",
          kind: "ordered",
          start: 5,
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 5" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const list = doc.content[0];
    if (list.type === "list") {
      expect(list.kind).toBe("ordered");
      expect(list.start).toBe(5);
    }
  });

  test("creates a document with a checklist", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "list",
          kind: "unordered",
          children: [
            {
              type: "listItem",
              checked: true,
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Done" }],
                },
              ],
            },
            {
              type: "listItem",
              checked: false,
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Todo" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const list = doc.content[0];
    if (list.type === "list") {
      expect(list.children[0].checked).toBe(true);
      expect(list.children[1].checked).toBe(false);
    }
  });

  test("creates a document with a table", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "table",
          align: ["left", "center", "right"],
          children: [
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "A" }] },
                { type: "tableCell", children: [{ type: "text", value: "B" }] },
                { type: "tableCell", children: [{ type: "text", value: "C" }] },
              ],
            },
          ],
        },
      ],
    });

    const table = doc.content[0];
    expect(table.type).toBe("table");
    if (table.type === "table") {
      expect(table.align).toEqual(["left", "center", "right"]);
      expect(table.children).toHaveLength(1);
    }
  });

  test("creates a document with an image", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "image",
          src: "./diagram.png",
          alt: "A diagram",
          title: "Diagram title",
          width: 800,
          height: 600,
        },
      ],
    });

    const img = doc.content[0];
    expect(img.type).toBe("image");
    if (img.type === "image") {
      expect(img.src).toBe("./diagram.png");
      expect(img.alt).toBe("A diagram");
      expect(img.width).toBe(800);
      expect(img.height).toBe(600);
    }
  });

  test("creates a document with a divider", () => {
    const doc = defineDoc({
      title: "Test",
      content: [{ type: "divider" }],
    });

    expect(doc.content[0].type).toBe("divider");
  });

  test("creates a document with a thematic break", () => {
    const doc = defineDoc({
      title: "Test",
      content: [{ type: "thematicBreak" }],
    });

    expect(doc.content[0].type).toBe("thematicBreak");
  });

  test("creates a document with a tab group", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "tabGroup",
          children: [
            {
              type: "tabItem",
              label: "TypeScript",
              children: [
                {
                  type: "codeBlock",
                  lang: "ts",
                  value: "const x = 1;",
                },
              ],
            },
            {
              type: "tabItem",
              label: "Python",
              children: [
                {
                  type: "codeBlock",
                  lang: "python",
                  value: "x = 1",
                },
              ],
            },
          ],
        },
      ],
    });

    const tabs = doc.content[0];
    expect(tabs.type).toBe("tabGroup");
    if (tabs.type === "tabGroup") {
      expect(tabs.children).toHaveLength(2);
      expect(tabs.children[0].label).toBe("TypeScript");
      expect(tabs.children[1].label).toBe("Python");
    }
  });

  test("creates a document with a badge", () => {
    const doc = defineDoc({
      title: "Test",
      content: [{ type: "badge", label: "stable", variant: "success" }],
    });

    const badge = doc.content[0];
    expect(badge.type).toBe("badge");
    if (badge.type === "badge") {
      expect(badge.label).toBe("stable");
      expect(badge.variant).toBe("success");
    }
  });

  test("creates a document with a blockquote", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "blockquote",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "Quote text" }],
            },
          ],
        },
      ],
    });

    const bq = doc.content[0];
    expect(bq.type).toBe("blockquote");
    if (bq.type === "blockquote") {
      expect(bq.children).toHaveLength(1);
    }
  });

  test("creates a document with inline formatting", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "Normal " },
            { type: "bold", children: [{ type: "text", value: "bold" }] },
            { type: "text", value: " " },
            { type: "italic", children: [{ type: "text", value: "italic" }] },
            { type: "text", value: " " },
            { type: "codeInline", value: "code" },
            { type: "text", value: " " },
            {
              type: "link",
              href: "https://example.com",
              children: [{ type: "text", value: "link" }],
            },
          ],
        },
      ],
    });

    const para = doc.content[0];
    expect(para.type).toBe("paragraph");
    if (para.type === "paragraph") {
      expect(para.children).toHaveLength(8);
      expect(para.children[1].type).toBe("bold");
      expect(para.children[3].type).toBe("italic");
      expect(para.children[5].type).toBe("codeInline");
      expect(para.children[7].type).toBe("link");
    }
  });

  test("creates a document with description and metadata", () => {
    const doc = defineDoc({
      title: "Test",
      description: "A test document",
      metadata: { version: "1.0", author: "test" },
      content: [],
    });

    expect(doc.description).toBe("A test document");
    expect(doc.metadata).toEqual({ version: "1.0", author: "test" });
  });

  test("sets heading id", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "heading",
          level: 2,
          id: "my-section",
          children: [{ type: "text", value: "Section" }],
        },
      ],
    });

    const heading = doc.content[0];
    if (heading.type === "heading") {
      expect(heading.id).toBe("my-section");
    }
  });

  test("sets code block meta", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "codeBlock",
          lang: "ts",
          meta: "title=example.ts",
          value: "const x = 1;",
        },
      ],
    });

    const code = doc.content[0];
    if (code.type === "codeBlock") {
      expect(code.meta).toBe("title=example.ts");
    }
  });

  test("sets list spread", () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        {
          type: "list",
          kind: "unordered",
          spread: true,
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const list = doc.content[0];
    if (list.type === "list") {
      expect(list.spread).toBe(true);
    }
  });
});

// ─── Validation tests ─────────────────────────────────────────────────

describe("defineDoc validation", () => {
  test("throws if options is not an object", () => {
    expect(() => defineDoc(null as never)).toThrow(TypeError);
  });

  test("throws if title is missing", () => {
    expect(() => defineDoc({ title: undefined as never, content: [] })).toThrow(TypeError);
  });

  test("throws if content is a plain string", () => {
    expect(() => defineDoc({ title: "Test", content: "hello" as never })).toThrow(TypeError);
  });

  test("throws for unknown block type", () => {
    expect(() =>
      defineDoc({
        title: "Test",
        content: [{ type: "unknown" }] as never as DocBlock[],
      })
    ).toThrow(TypeError);
  });

  test("throws for invalid heading level", () => {
    expect(() =>
      defineDoc({
        title: "Test",
        content: [{ type: "heading", level: 7, children: [] } as never],
      })
    ).toThrow(TypeError);
  });

  test("throws for invalid callout kind", () => {
    expect(() =>
      defineDoc({
        title: "Test",
        content: [{ type: "callout", kind: "invalid", children: [] } as never],
      })
    ).toThrow(TypeError);
  });

  test("throws for invalid list kind", () => {
    expect(() =>
      defineDoc({
        title: "Test",
        content: [{ type: "list", kind: "mixed", children: [] } as never],
      })
    ).toThrow(TypeError);
  });

  test("throws for invalid badge variant", () => {
    expect(() =>
      defineDoc({
        title: "Test",
        content: [{ type: "badge", label: "x", variant: "neon" } as never],
      })
    ).toThrow(TypeError);
  });

  test("accepts all valid callout kinds", () => {
    const kinds: Array<"note" | "tip" | "warning" | "important" | "caution"> = [
      "note",
      "tip",
      "warning",
      "important",
      "caution",
    ];
    for (const kind of kinds) {
      const doc = defineDoc({
        title: "Test",
        content: [{ type: "callout", kind, children: [{ type: "text", value: "text" }] }],
      });
      const callout = doc.content[0];
      if (callout.type === "callout") {
        expect(callout.kind).toBe(kind);
      }
    }
  });

  test("accepts all valid badge variants", () => {
    const variants: Array<"default" | "primary" | "success" | "warning" | "danger" | "info"> = [
      "default",
      "primary",
      "success",
      "warning",
      "danger",
      "info",
    ];
    for (const variant of variants) {
      const doc = defineDoc({
        title: "Test",
        content: [{ type: "badge", label: "x", variant }],
      });
      const badge = doc.content[0];
      if (badge.type === "badge") {
        expect(badge.variant).toBe(variant);
      }
    }
  });

  test("badge without variant is valid", () => {
    const doc = defineDoc({
      title: "Test",
      content: [{ type: "badge", label: "new" }],
    });
    const badge = doc.content[0];
    if (badge.type === "badge") {
      expect(badge.variant).toBeUndefined();
    }
  });

  test("throws for invalid metadata type", () => {
    expect(() =>
      defineDoc({
        title: "Test",
        content: [],
        metadata: "invalid" as never,
      })
    ).toThrow(TypeError);
  });
});
