import type { BuiltinIconName, DiagramNode, IconSpec, NodeShapeSpec } from "@drawspec/core";

/** Normalized visual properties used by layout and rendering. */
export interface NormalizedNodeVisuals {
  /** Resolved node shape, either explicit or derived from node kind. */
  shape: NodeShapeSpec;
  /** Resolved icons, preserving explicit array order. */
  icons: IconSpec[];
}

const KIND_SHAPE_DEFAULTS: Record<string, NodeShapeSpec> = {
  person: { type: "rounded-rect", radius: 12 },
  actor: { type: "rounded-rect", radius: 12 },
  container: { type: "rounded-rect", radius: 12 },
  database: { type: "cylinder", curve: 18 },
  component: { type: "rounded-rect", radius: 3 },
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
