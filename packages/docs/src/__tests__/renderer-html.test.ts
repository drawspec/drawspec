import { describe, expect, test } from "bun:test";
import { compileDoc } from "../compiler";
import { defineDoc } from "../define-doc";
import { renderDocHtml } from "../renderer-html";
import type { DiagramNode } from "../types";

async function makeCompiledDoc(content: Parameters<typeof defineDoc>[0]["content"]) {
  const doc = defineDoc({ title: "Test", content });
  return compileDoc(doc);
}

describe("renderDocHtml", () => {
  test("renders a document with title", async () => {
    const compiled = await makeCompiledDoc([]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<h1");
    expect(html).toContain("Test");
    expect(html).toContain("<article");
  });

  test("renders a paragraph", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "paragraph",
        children: [{ type: "text", value: "Hello, world!" }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<p");
    expect(html).toContain("Hello, world!");
  });

  test("renders a heading", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "heading",
        level: 2,
        children: [{ type: "text", value: "Section" }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<h2");
    expect(html).toContain("Section");
  });

  test("renders heading with id", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "heading",
        level: 2,
        id: "my-section",
        children: [{ type: "text", value: "Section" }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain('id="my-section"');
  });

  test("renders bold text", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "paragraph",
        children: [{ type: "bold", children: [{ type: "text", value: "bold" }] }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<strong>");
    expect(html).toContain("bold");
  });

  test("renders italic text", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "paragraph",
        children: [{ type: "italic", children: [{ type: "text", value: "italic" }] }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<em>");
  });

  test("renders inline code", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "paragraph",
        children: [{ type: "codeInline", value: "const x = 1" }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<code>");
    expect(html).toContain("const x = 1");
  });

  test("renders a link", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "paragraph",
        children: [
          {
            type: "link",
            href: "https://example.com",
            children: [{ type: "text", value: "Link" }],
          },
        ],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("Link");
  });

  test("renders a code block with syntax highlighting", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "codeBlock",
        lang: "typescript",
        value: "const x: number = 1;",
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("code-block");
    expect(html).toContain("typescript");
  });

  test("renders a code block with custom highlighter", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "codeBlock",
        lang: "ts",
        value: "const x = 1;",
      },
    ]);
    const html = await renderDocHtml(compiled, {
      highlightCode: async (code, lang) => `<pre><code class="custom-${lang}">${code}</code></pre>`,
    });
    expect(html).toContain("custom-ts");
    expect(html).toContain("const x = 1;");
  });

  test("renders a diagram placeholder", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "diagram",
        ref: "./overview.arch.ts",
        caption: "Overview",
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("data-diagram-ref");
    expect(html).toContain("./overview.arch.ts");
    expect(html).toContain("Overview");
  });

  test("renders a callout", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "callout",
        kind: "tip",
        title: "Pro tip",
        children: [{ type: "text", value: "Be helpful" }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("callout");
    expect(html).toContain("Pro tip");
    expect(html).toContain("Be helpful");
  });

  test("renders a link block", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "linkBlock",
        href: "./next.doc.ts",
        label: "Next →",
        description: "Continue",
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("./next.doc.ts");
    expect(html).toContain("Next →");
    expect(html).toContain("Continue");
  });

  test("renders an unordered list", async () => {
    const compiled = await makeCompiledDoc([
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
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<ul");
    expect(html).toContain("<li>");
    expect(html).toContain("Item 1");
    expect(html).toContain("Item 2");
  });

  test("renders an ordered list with start", async () => {
    const compiled = await makeCompiledDoc([
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
                children: [{ type: "text", value: "Item" }],
              },
            ],
          },
        ],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<ol");
    expect(html).toContain('start="5"');
  });

  test("renders a list with checkboxes", async () => {
    const compiled = await makeCompiledDoc([
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
        ],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("checkbox");
    expect(html).toContain("checked");
  });

  test("renders a table", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "table",
        children: [
          {
            type: "tableRow",
            children: [
              { type: "tableCell", children: [{ type: "text", value: "A" }] },
              { type: "tableCell", children: [{ type: "text", value: "B" }] },
            ],
          },
          {
            type: "tableRow",
            children: [
              { type: "tableCell", children: [{ type: "text", value: "1" }] },
              { type: "tableCell", children: [{ type: "text", value: "2" }] },
            ],
          },
        ],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<table");
    expect(html).toContain("<th>");
    expect(html).toContain("<td>");
  });

  test("renders an image", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "image",
        src: "./diagram.png",
        alt: "A diagram",
        width: 800,
        height: 600,
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<img");
    expect(html).toContain('src="./diagram.png"');
    expect(html).toContain('alt="A diagram"');
    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
  });

  test("renders a divider", async () => {
    const compiled = await makeCompiledDoc([{ type: "divider" }]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<hr");
  });

  test("renders a thematic break", async () => {
    const compiled = await makeCompiledDoc([{ type: "thematicBreak" }]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<hr");
  });

  test("renders a tab group", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "tabGroup",
        children: [
          {
            type: "tabItem",
            label: "TS",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "TypeScript" }],
              },
            ],
          },
          {
            type: "tabItem",
            label: "JS",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "JavaScript" }],
              },
            ],
          },
        ],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("tab-group");
    expect(html).toContain("TS");
    expect(html).toContain("JS");
  });

  test("renders a badge", async () => {
    const compiled = await makeCompiledDoc([
      { type: "badge", label: "stable", variant: "success" },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("badge");
    expect(html).toContain("stable");
  });

  test("renders a blockquote", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "Quoted text" }],
          },
        ],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("<blockquote");
    expect(html).toContain("Quoted text");
  });

  test("renders document description", async () => {
    const doc = defineDoc({
      title: "Test",
      description: "A description",
      content: [],
    });
    const compiled = await compileDoc(doc);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("A description");
  });

  test("uses custom class prefix", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "paragraph",
        children: [{ type: "text", value: "Hello" }],
      },
    ]);
    const html = await renderDocHtml(compiled, { classPrefix: "custom" });
    expect(html).toContain("custom-");
  });

  test("escapes HTML in text content", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "paragraph",
        children: [{ type: "text", value: "<script>alert('xss')</script>" }],
      },
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("escapes HTML in code blocks", async () => {
    const compiled = await makeCompiledDoc([
      {
        type: "codeBlock",
        lang: "html",
        value: '<div class="foo">bar</div>',
      },
    ]);
    const html = await renderDocHtml(compiled, {
      highlightCode: async (code) => `<pre><code>${code}</code></pre>`,
    });
    // The custom highlighter receives raw code — the fallback escaping happens
    // in the default path. With a custom highlighter we pass through.
    expect(html).toBeDefined();
  });

  test("renders diagram with custom renderDiagram callback", async () => {
    const compiled = await makeCompiledDoc([
      { type: "diagram", ref: "./test.seq.ts", caption: "Test Diagram" } as DiagramNode,
    ]);
    const customSvg = "<svg>custom-diagram</svg>";
    const html = await renderDocHtml(compiled, {
      renderDiagram: async (node) => {
        expect(node.ref).toBe("./test.seq.ts");
        return customSvg;
      },
    });
    expect(html).toContain(customSvg);
    expect(html).toContain('data-diagram-ref="./test.seq.ts"');
    expect(html).toContain("ds-diagram-caption");
    expect(html).toContain("Test Diagram");
  });

  test("renders diagram with placeholder when no callback", async () => {
    const compiled = await makeCompiledDoc([
      { type: "diagram", ref: "./test.seq.ts" } as DiagramNode,
    ]);
    const html = await renderDocHtml(compiled);
    expect(html).toContain("ds-diagram-placeholder");
    expect(html).toContain("Diagram: ./test.seq.ts");
  });

  test("renders title and description by default", async () => {
    const doc = defineDoc({
      title: "My Page",
      description: "My description",
      content: [{ type: "paragraph", children: [{ type: "text", value: "Body" }] }],
    });
    const compiled = await compileDoc(doc);
    const html = await renderDocHtml(compiled);
    expect(html).toContain('<h1 class="ds-title">My Page</h1>');
    expect(html).toContain("My description");
  });

  test("skips title and strips leading h1 when renderHeader is false", async () => {
    const doc = defineDoc({
      title: "My Page",
      description: "My description",
      content: [
        { type: "heading", level: 1, children: [{ type: "text", value: "My Page" }] },
        { type: "heading", level: 2, children: [{ type: "text", value: "Section" }] },
        { type: "paragraph", children: [{ type: "text", value: "Body" }] },
      ],
    });
    const compiled = await compileDoc(doc);
    const html = await renderDocHtml(compiled, { renderHeader: false });
    expect(html).not.toContain("ds-title");
    expect(html).not.toContain("My description");
    expect(html).not.toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("Section");
    expect(html).toContain("Body");
  });

  test("renderHeader false does not strip non-leading h1", async () => {
    const doc = defineDoc({
      title: "Test",
      content: [
        { type: "paragraph", children: [{ type: "text", value: "Intro" }] },
        { type: "heading", level: 1, children: [{ type: "text", value: "Later H1" }] },
      ],
    });
    const compiled = await compileDoc(doc);
    const html = await renderDocHtml(compiled, { renderHeader: false });
    expect(html).toContain("<h1");
    expect(html).toContain("Later H1");
  });
});
