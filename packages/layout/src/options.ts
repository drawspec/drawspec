import type {
  DiagramDocument,
  LayoutDirection,
  LayoutOptions,
  LayoutRouting,
  NormalizedLayoutOptions,
} from "./types";

const DEFAULT_DIRECTION: LayoutDirection = "TB";
const DEFAULT_ROUTING: LayoutRouting = "straight";

const directionBySpec: Record<string, LayoutDirection> = {
  bt: "BT",
  lr: "LR",
  rl: "RL",
  tb: "TB",
};

export function normalizeLayoutOptions(
  document: DiagramDocument,
  options: LayoutOptions = {}
): NormalizedLayoutOptions {
  return {
    direction:
      options.direction ?? directionBySpec[document.layout?.direction ?? ""] ?? DEFAULT_DIRECTION,
    routing: options.routing ?? DEFAULT_ROUTING,
    spacing: {
      lifeline: options.spacing?.lifeline ?? 160,
      message: options.spacing?.message ?? 56,
      node: options.spacing?.node ?? document.layout?.nodeSpacing ?? 80,
      rank: options.spacing?.rank ?? document.layout?.rankSpacing ?? 120,
    },
    padding: options.padding ?? 40,
    nodeSize: {
      height: options.nodeSize?.height ?? 56,
      width: options.nodeSize?.width ?? 120,
    },
  };
}
