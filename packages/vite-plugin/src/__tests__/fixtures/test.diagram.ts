import type { DiagramDocument } from "@drawspec/core";

export default {
  schemaVersion: "1.0.0",
  id: "test-diagram",
  kind: "graph",
  nodes: [{ id: "a", kind: "component", label: "A" }],
  edges: [],
  groups: [],
  annotations: [],
} satisfies DiagramDocument;
