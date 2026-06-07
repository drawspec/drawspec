import { MutableGanttBuilder } from "./builders";
import { compileGanttDocument } from "./compile";
import type { GanttDiagramBuilderApi, GanttDocument } from "./types";

export { MutableGanttBuilder } from "./builders";
export { compile, compileGanttDocument } from "./compile";
export {
  compileDependencyEdge,
  compileMilestoneLayout,
  compileSectionLayout,
  compileTaskLayout,
  computeLayoutMetrics,
} from "./layout";
export type {
  GanttDiagramBuilderApi,
  GanttDocument,
  GanttDomainModel,
  GanttElement,
  GanttMilestone,
  GanttSection,
  GanttTask,
  SectionBuilderApi,
  TaskOptions,
} from "./types";

/**
 * Build a complete Gantt diagram with a callback-based DSL.
 *
 * @param title - Diagram title
 * @param callback - Builder callback receiving the DSL API
 * @returns A compiled GanttDocument ready for layout and rendering
 *
 * @example
 * ```ts
 * ganttDiagram("Project Timeline", (g) => {
 *   g.task("Planning", { startDate: "2025-01-01", endDate: "2025-01-15" });
 *   g.task("Development", {
 *     startDate: "2025-01-16",
 *     endDate: "2025-02-28",
 *     progress: 50,
 *   });
 *   g.milestone("Alpha Release", "2025-03-01");
 *   g.section("Phase 2", (s) => {
 *     s.task("Testing", { startDate: "2025-03-02", endDate: "2025-03-15" });
 *   });
 * })
 * ```
 */
export function ganttDiagram(
  title: string,
  callback: (api: GanttDiagramBuilderApi) => void
): GanttDocument {
  const builder = new MutableGanttBuilder();
  callback(builder);
  return compileGanttDocument(builder.toModel(title));
}
