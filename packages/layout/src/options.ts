import { createTextMeasurer } from "@drawspec/text-measure";
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
  const nodeSize = {
    height: options.nodeSize?.height ?? 56,
    width: options.nodeSize?.width ?? 120,
  };
  const fontSize = options.sizing?.typography?.fontSize ?? 14;

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
    nodeSize,
    sizing: {
      mode: options.sizing === undefined ? "fixed" : (options.sizing.mode ?? "auto"),
      defaultSize: {
        width: options.nodeSize?.width ?? options.sizing?.defaultSize?.width ?? 120,
        height: options.nodeSize?.height ?? options.sizing?.defaultSize?.height ?? 56,
      },
      minSize: {
        width: options.sizing?.minSize?.width ?? 60,
        height: options.sizing?.minSize?.height ?? 40,
      },
      maxSize: {
        width: options.sizing?.maxSize?.width ?? Infinity,
        height: options.sizing?.maxSize?.height ?? Infinity,
      },
      padding: options.sizing?.padding ?? { x: 16, y: 10 },
      labelOverflow: document.labelOverflow ?? "wrap",
      labelWrap: options.sizing?.labelWrap ?? "auto",
      fontSize,
      lineHeight: fontSize * 1.3,
      measurer: options.sizing?.measurer ?? createTextMeasurer(),
    },
  };
}
