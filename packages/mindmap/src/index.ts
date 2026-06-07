import { MindmapBuilder } from "./builders";
import { compileMindmapDocument } from "./compile";
import type { MindmapDocument } from "./types";

export { MindmapBuilder } from "./builders";
export { compile, compileMindmapDocument } from "./compile";
export type {
  BranchStyle,
  MindmapChildrenBuilder,
  MindmapDocument,
  MindmapDomainModel,
  MindmapNode,
  MindmapNodeBuilder,
  MindmapNodeOptions,
  MindmapNodeShape,
} from "./types";
export { BRANCH_COLORS, lightenColor, mapShape } from "./types";

/**
 * Build a mindmap diagram using a fluent callback API.
 *
 * @param title - Diagram title
 * @param callback - Builder callback receiving a MindmapBuilder instance
 * @returns A compiled MindmapDocument ready for layout and rendering
 *
 * @example
 * ```ts
 * mindmap("Project Plan", (m) => {
 *   m.root("Project")
 *     .node("Planning")
 *     .node("Design")
 *     .node("Implementation", { shape: "square" });
 * })
 * ```
 */
export function mindmap(
  title: string,
  callback: (builder: MindmapBuilder) => void
): MindmapDocument {
  const builder = new MindmapBuilder(title);
  callback(builder);
  const model = builder.toModel();
  return compileMindmapDocument(model);
}
