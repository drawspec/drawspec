import type { BuiltinIconName, DiagramNode, IconSpec, NodeShapeSpec } from "@drawspec/core";

/** Normalized visual properties used by layout and rendering. */
export interface NormalizedNodeVisuals {
  /** Resolved node shape, either explicit or derived from node kind. */
  shape: NodeShapeSpec;
  /** Resolved icons, preserving explicit array order. */
  icons: IconSpec[];
}

const KIND_SHAPE_DEFAULTS: Record<string, NodeShapeSpec> = {
  actor: { type: "rounded-rect", radius: 12 },
  artifact: { type: "document" },
  choice: { type: "diamond" },
  container: { type: "rounded-rect", radius: 12 },
  database: { type: "cylinder", curve: 18 },
  decision: { type: "diamond" },
  final: { type: "bullseye" },
  fork: { type: "sync-bar" },
  initial: { type: "circle" },
  join: { type: "sync-bar" },
  note: { type: "note" },
  object: { type: "rect" },
  person: { type: "rounded-rect", radius: 12 },
  "system-boundary": { type: "rect" },
  "timing-participant": { type: "rect" },
  "timing-state": { type: "rounded-rect", radius: 8 },
  "use-case": { type: "ellipse" },
  component: { type: "tabbed-rect" },
};

const KIND_ICON_DEFAULTS: Record<string, BuiltinIconName> = {
  person: "person",
  actor: "actor",
};

/** Resolves node visual defaults from explicit node settings and semantic node kind. */
export function normalizeNodeVisuals(node: DiagramNode): NormalizedNodeVisuals {
  const shape = node.shape ?? KIND_SHAPE_DEFAULTS[node.kind] ?? { type: "rounded-rect", radius: 3 };
  const explicitIcons = node.icons;

  if (explicitIcons !== undefined) {
    return { shape, icons: explicitIcons };
  }

  const defaultIconName = KIND_ICON_DEFAULTS[node.kind];
  if (defaultIconName === undefined) {
    return { shape, icons: [] };
  }

  return {
    shape,
    icons: [
      { type: "builtin", name: defaultIconName, placement: "top", size: { width: 24, height: 30 } },
    ],
  };
}
