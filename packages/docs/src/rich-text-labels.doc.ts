import { defineDoc } from "./define-doc";

export const richTextLabelsDoc = defineDoc({
  title: "Rich text labels",
  description: "Using formatted label segments in DrawSpec diagrams.",
  content: [
    {
      type: "heading",
      level: 1,
      children: [{ type: "text", value: "Rich text labels" }],
    },
    {
      type: "paragraph",
      children: [
        { type: "text", value: "Labels can still be plain strings, or they can be " },
        { type: "codeInline", value: "RichText" },
        { type: "text", value: " arrays with bold, italic, code, and link metadata segments." },
      ],
    },
    {
      type: "codeBlock",
      lang: "ts",
      value: `import type { DiagramDocument, RichText } from "@drawspec/core";

const label: RichText = [
  { text: "API", bold: true },
  { text: " calls " },
  { text: "checkout", code: true },
  { text: " asynchronously", italic: true },
];

export const doc: DiagramDocument = {
  schemaVersion: "1.0.0",
  id: "rich-labels",
  kind: "graph",
  nodes: [{ id: "api", kind: "component", label }],
  edges: [],
  groups: [],
  annotations: [],
};`,
    },
    {
      type: "paragraph",
      children: [
        { type: "text", value: "For simple authoring, " },
        { type: "codeInline", value: "parseRichText('**API** calls `checkout`')" },
        { type: "text", value: " converts a small Markdown-like subset into rich text segments." },
      ],
    },
  ],
});
