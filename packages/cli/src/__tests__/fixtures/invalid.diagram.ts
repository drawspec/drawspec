import type { DiagramDocument } from "@drawspec/core";

export default {
  schemaVersion: "1.0.0",
  id: "invalid-cli-fixture",
  kind: "graph",
  nodes: [
    { id: "duplicate", kind: "component", label: "One" },
    { id: "duplicate", kind: "component", label: "Two" },
  ],
  edges: [],
  groups: [],
  annotations: [],
} satisfies DiagramDocument;
