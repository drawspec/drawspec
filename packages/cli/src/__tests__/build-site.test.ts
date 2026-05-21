import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import type { SiteDiagram } from "../build-site";
import {
  generateDiagramHtml,
  generateIndexHtml,
  generateStyleCss,
  toSiteDiagram,
} from "../build-site";

const sampleDoc: DiagramDocument = {
  schemaVersion: "1",
  id: "my-diagram",
  title: "My Diagram",
  kind: "sequence",
  nodes: [
    { id: "a", kind: "actor", label: "A" },
    { id: "b", kind: "actor", label: "B" },
  ],
  edges: [{ id: "e1", kind: "message", sourceId: "a", targetId: "b", label: "hello" }],
  groups: [],
  annotations: [],
};

const sampleSvg = "<svg><text>Hello</text></svg>";

describe("toSiteDiagram", () => {
  test("converts DiagramDocument and SVG to SiteDiagram", () => {
    const result = toSiteDiagram(sampleDoc, sampleSvg);

    expect(result.id).toBe("my-diagram");
    expect(result.title).toBe("My Diagram");
    expect(result.kind).toBe("sequence");
    expect(result.nodeCount).toBe(2);
    expect(result.edgeCount).toBe(1);
    expect(result.svg).toBe(sampleSvg);
  });

  test("uses id as fallback title", () => {
    const doc = { ...sampleDoc, title: undefined };
    const result = toSiteDiagram(doc, sampleSvg);

    expect(result.title).toBe("my-diagram");
  });
});

describe("generateStyleCss", () => {
  test("produces non-empty CSS", () => {
    const css = generateStyleCss();

    expect(css).toContain("body");
    expect(css).toContain(".grid");
    expect(css).toContain(".card");
    expect(css).toContain(".diagram-svg");
  });
});

describe("generateIndexHtml", () => {
  test("generates index with diagram cards", () => {
    const diagrams: SiteDiagram[] = [toSiteDiagram(sampleDoc, sampleSvg)];
    const html = generateIndexHtml(diagrams);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("DrawSpec Diagrams");
    expect(html).toContain('href="my-diagram.html"');
    expect(html).toContain("My Diagram");
    expect(html).toContain("2 nodes");
    expect(html).toContain("1 edge");
    expect(html).toContain(sampleSvg);
    expect(html).toContain('href="style.css"');
  });

  test("pluralizes diagram count", () => {
    const html1 = generateIndexHtml([toSiteDiagram(sampleDoc, sampleSvg)]);
    expect(html1).toContain("1 diagram</p>");

    const html2 = generateIndexHtml([
      toSiteDiagram(sampleDoc, sampleSvg),
      toSiteDiagram({ ...sampleDoc, id: "second" }, sampleSvg),
    ]);
    expect(html2).toContain("2 diagrams</p>");
  });

  test("escapes HTML in titles", () => {
    const doc = { ...sampleDoc, title: '<script>alert("xss")</script>' };
    const html = generateIndexHtml([toSiteDiagram(doc, sampleSvg)]);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("generateDiagramHtml", () => {
  test("generates detail page with SVG and metadata", () => {
    const diagram = toSiteDiagram(sampleDoc, sampleSvg);
    const html = generateDiagramHtml(diagram);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("My Diagram");
    expect(html).toContain(sampleSvg);
    expect(html).toContain("my-diagram");
    expect(html).toContain("sequence");
    expect(html).toContain("<dd>2</dd>");
    expect(html).toContain("<dd>1</dd>");
    expect(html).toContain('href="index.html"');
    expect(html).toContain('href="style.css"');
  });
});
