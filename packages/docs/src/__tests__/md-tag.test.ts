import { describe, expect, test } from "bun:test";
import { md } from "../md-tag";

describe("md tagged template", () => {
  test("parses a heading", async () => {
    const nodes = await md`## Hello World`;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("heading");
    if (nodes[0].type === "heading") {
      expect(nodes[0].level).toBe(2);
      expect(nodes[0].children[0].type).toBe("text");
    }
  });

  test("parses a paragraph", async () => {
    const nodes = await md`Hello, world!`;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("paragraph");
    if (nodes[0].type === "paragraph") {
      expect(nodes[0].children[0].type).toBe("text");
    }
  });

  test("parses bold text", async () => {
    const nodes = await md`This is **bold** text.`;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("paragraph");
    if (nodes[0].type === "paragraph") {
      const boldNode = nodes[0].children.find((c) => c.type === "bold");
      expect(boldNode).toBeDefined();
      if (boldNode?.type === "bold") {
        expect(boldNode.children[0].type).toBe("text");
      }
    }
  });

  test("parses italic text", async () => {
    const nodes = await md`This is *italic* text.`;
    expect(nodes).toHaveLength(1);
    if (nodes[0].type === "paragraph") {
      const emNode = nodes[0].children.find((c) => c.type === "italic");
      expect(emNode).toBeDefined();
    }
  });

  test("parses inline code", async () => {
    const nodes = await md`Use \`console.log\` to debug.`;
    expect(nodes).toHaveLength(1);
    if (nodes[0].type === "paragraph") {
      const codeNode = nodes[0].children.find((c) => c.type === "codeInline");
      expect(codeNode).toBeDefined();
      if (codeNode?.type === "codeInline") {
        expect(codeNode.value).toBe("console.log");
      }
    }
  });

  test("parses a code block", async () => {
    const nodes = await md`
\`\`\`typescript
const x = 1;
\`\`\`
`;
    const codeNode = nodes.find((n) => n.type === "codeBlock");
    expect(codeNode).toBeDefined();
    if (codeNode?.type === "codeBlock") {
      expect(codeNode.lang).toBe("typescript");
      expect(codeNode.value).toBe("const x = 1;");
    }
  });

  test("parses a code block without language", async () => {
    const nodes = await md`
\`\`\`
plain text
\`\`\`
`;
    const codeNode = nodes.find((n) => n.type === "codeBlock");
    expect(codeNode).toBeDefined();
    if (codeNode?.type === "codeBlock") {
      expect(codeNode.lang).toBeUndefined();
    }
  });

  test("parses an unordered list", async () => {
    const nodes = await md`
- Item 1
- Item 2
- Item 3
`;
    const listNode = nodes.find((n) => n.type === "list");
    expect(listNode).toBeDefined();
    if (listNode?.type === "list") {
      expect(listNode.kind).toBe("unordered");
      expect(listNode.children).toHaveLength(3);
    }
  });

  test("parses an ordered list", async () => {
    const nodes = await md`
1. First
2. Second
3. Third
`;
    const listNode = nodes.find((n) => n.type === "list");
    expect(listNode).toBeDefined();
    if (listNode?.type === "list") {
      expect(listNode.kind).toBe("ordered");
      expect(listNode.children).toHaveLength(3);
    }
  });

  test("parses a checklist", async () => {
    const nodes = await md`
- [x] Done
- [ ] Todo
`;
    const listNode = nodes.find((n) => n.type === "list");
    expect(listNode).toBeDefined();
    if (listNode?.type === "list") {
      expect(listNode.children[0].checked).toBe(true);
      expect(listNode.children[1].checked).toBe(false);
    }
  });

  test("parses a table", async () => {
    const nodes = await md`
| Name  | Value |
|-------|-------|
| Alpha | 1     |
| Beta  | 2     |
`;
    const tableNode = nodes.find((n) => n.type === "table");
    expect(tableNode).toBeDefined();
    if (tableNode?.type === "table") {
      expect(tableNode.children).toHaveLength(3); // header + 2 rows
    }
  });

  test("parses a blockquote", async () => {
    const nodes = await md`
> This is a quote.
`;
    const bqNode = nodes.find((n) => n.type === "blockquote");
    expect(bqNode).toBeDefined();
    if (bqNode?.type === "blockquote") {
      expect(bqNode.children).toHaveLength(1);
    }
  });

  test("parses a thematic break", async () => {
    const nodes = await md`
First paragraph.

---

Second paragraph.
`;
    const hrNode = nodes.find((n) => n.type === "thematicBreak");
    expect(hrNode).toBeDefined();
  });

  test("parses an image", async () => {
    const nodes = await md`
![Alt text](./image.png "Image title")
`;
    const imgNode = nodes.find((n) => n.type === "image");
    expect(imgNode).toBeDefined();
    if (imgNode?.type === "image") {
      expect(imgNode.src).toBe("./image.png");
      expect(imgNode.alt).toBe("Alt text");
    }
  });

  test("parses a link", async () => {
    const nodes = await md`Check out [DrawSpec](https://drawspec.dev).`;
    if (nodes[0].type === "paragraph") {
      const linkNode = nodes[0].children.find((c) => c.type === "link");
      expect(linkNode).toBeDefined();
      if (linkNode?.type === "link") {
        expect(linkNode.href).toBe("https://drawspec.dev");
      }
    }
  });

  test("parses @diagram directive", async () => {
    const nodes = await md`
@diagram ./overview.arch.ts
`;
    const diagramNode = nodes.find((n) => n.type === "diagram");
    expect(diagramNode).toBeDefined();
    if (diagramNode?.type === "diagram") {
      expect(diagramNode.ref).toBe("./overview.arch.ts");
    }
  });

  test("parses @diagram with caption", async () => {
    const nodes = await md`
@diagram ./overview.arch.ts "System overview"
`;
    const diagramNode = nodes.find((n) => n.type === "diagram");
    expect(diagramNode).toBeDefined();
    if (diagramNode?.type === "diagram") {
      expect(diagramNode.caption).toBe("System overview");
    }
  });

  test("parses @badge directive", async () => {
    const nodes = await md`
@badge stable success
`;
    const badgeNode = nodes.find((n) => n.type === "badge");
    expect(badgeNode).toBeDefined();
    if (badgeNode?.type === "badge") {
      expect(badgeNode.label).toBe("stable");
      expect(badgeNode.variant).toBe("success");
    }
  });

  test("parses @badge without variant", async () => {
    const nodes = await md`
@badge new
`;
    const badgeNode = nodes.find((n) => n.type === "badge");
    expect(badgeNode).toBeDefined();
    if (badgeNode?.type === "badge") {
      expect(badgeNode.label).toBe("new");
      expect(badgeNode.variant).toBeUndefined();
    }
  });

  test("parses @callout directive", async () => {
    const nodes = await md`
@callout tip "Pro tip"

This is a tip.

@endcallout
`;
    const calloutNode = nodes.find((n) => n.type === "callout");
    expect(calloutNode).toBeDefined();
    if (calloutNode?.type === "callout") {
      expect(calloutNode.kind).toBe("tip");
      expect(calloutNode.title).toBe("Pro tip");
    }
  });

  test("handles template interpolation", async () => {
    const name = "World";
    const nodes = await md`Hello, ${name}!`;
    expect(nodes).toHaveLength(1);
    if (nodes[0].type === "paragraph") {
      const textContent = nodes[0].children
        .filter((c): c is { type: "text"; value: string } => c.type === "text")
        .map((c) => c.value)
        .join("");
      expect(textContent).toContain("World");
    }
  });

  test("returns empty array for empty string", async () => {
    const nodes = await md``;
    expect(nodes).toEqual([]);
  });

  test("parses multiple blocks", async () => {
    const nodes = await md`
# Title

Paragraph text.

## Subtitle

Another paragraph.
`;
    expect(nodes.filter((n) => n.type === "heading").length).toBeGreaterThanOrEqual(2);
    expect(nodes.filter((n) => n.type === "paragraph").length).toBeGreaterThanOrEqual(2);
  });

  test("parses nested list items", async () => {
    const nodes = await md`
- Item 1
  - Nested 1
  - Nested 2
- Item 2
`;
    const listNode = nodes.find((n) => n.type === "list");
    expect(listNode).toBeDefined();
    if (listNode?.type === "list") {
      expect(listNode.children.length).toBeGreaterThanOrEqual(1);
    }
  });
});
