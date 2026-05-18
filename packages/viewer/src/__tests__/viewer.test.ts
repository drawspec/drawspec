import { describe, expect, test } from "bun:test";
import type { DiagramDocument } from "@drawspec/core";
import { normalizeViewerPayload, renderDiagramSvg } from "../index";

const document: DiagramDocument = {
  schemaVersion: "1.0",
  id: "viewer-test",
  title: "Viewer Test",
  kind: "graph",
  nodes: [
    { id: "client", kind: "person", label: "Client" },
    { id: "api", kind: "system", label: "API" },
  ],
  edges: [{ id: "client-api", kind: "uses", sourceId: "client", targetId: "api", label: "calls" }],
  groups: [],
  annotations: [],
};

describe("@drawspec/viewer", () => {
  test("renders mock IR data to SVG", async () => {
    const svg = await renderDiagramSvg(document);

    expect(svg).toContain("<svg");
    expect(svg).toContain("Viewer Test");
    expect(svg).toContain("Client");
  });

  test("normalizes diagram payloads", () => {
    const payload = normalizeViewerPayload({ document, diagnostics: [] });

    expect(payload.document?.id).toBe("viewer-test");
    expect(payload.diagnostics).toEqual([]);
  });
});
