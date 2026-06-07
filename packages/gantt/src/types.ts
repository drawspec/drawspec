import type { DiagramDocument } from "@drawspec/core";

/** A Gantt chart task with time range and optional progress. */
export interface GanttTask {
  readonly id: string;
  readonly kind: "task";
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly progress?: number;
  readonly dependencies?: readonly string[];
}

/** A Gantt chart milestone marking a specific point in time. */
export interface GanttMilestone {
  readonly id: string;
  readonly kind: "milestone";
  readonly name: string;
  readonly date: string;
  readonly dependencies?: readonly string[];
}

/** A section grouping tasks and milestones visually. */
export interface GanttSection {
  readonly id: string;
  readonly kind: "section";
  readonly title: string;
  readonly items: readonly (GanttTask | GanttMilestone)[];
}

/** Union of all Gantt diagram elements. */
export type GanttElement = GanttTask | GanttMilestone | GanttSection;

/** Builder options for a Gantt task. */
export interface TaskOptions {
  readonly startDate: string;
  readonly endDate: string;
  readonly progress?: number;
  readonly dependencies?: readonly string[];
}

/** Builder API available inside a section callback. */
export interface SectionBuilderApi {
  /** Define a task within this section. */
  task(name: string, options: TaskOptions): void;
  /** Define a milestone within this section. */
  milestone(name: string, date: string): void;
}

/** Builder API available inside the ganttDiagram callback. */
export interface GanttDiagramBuilderApi {
  /** Define a standalone task. */
  task(name: string, options: TaskOptions): void;
  /** Define a standalone milestone. */
  milestone(name: string, date: string): void;
  /** Define a section that groups tasks and milestones. */
  section(title: string, callback: (api: SectionBuilderApi) => void): void;
}

/** Domain model for Gantt charts before compilation to IR. */
export interface GanttDomainModel {
  readonly id: string;
  readonly title: string;
  readonly items: readonly (GanttTask | GanttMilestone)[];
  readonly sections: readonly GanttSection[];
}

/** Compiled Gantt chart document. */
export type GanttDocument = DiagramDocument & { kind: "gantt" };
