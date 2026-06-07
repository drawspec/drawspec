import type { DiagramEdge, DiagramNode } from "@drawspec/core";
import type { GanttMilestone, GanttSection, GanttTask } from "./types";

/** Milliseconds per day — used for deterministic date arithmetic. */
const MS_PER_DAY = 86_400_000;

/** Parse an ISO date string to epoch milliseconds. */
function parseDate(iso: string): number {
  return new Date(iso).getTime();
}

/** Layout constants for Gantt chart rendering (in pixels). */
const ROW_HEIGHT = 36;
const TASK_BAR_HEIGHT = 24;
const MILESTONE_SIZE = 16;
const SECTION_HEADER_HEIGHT = 28;
const LEFT_MARGIN = 160;
const TOP_MARGIN = 40;
const DAY_WIDTH = 28;
const HEADER_HEIGHT = 32;

/** Computed layout metrics for a Gantt chart. */
export interface GanttLayoutMetrics {
  /** X position for a given date in pixels. */
  xForDate: (dateIso: string) => number;
  /** Y position for a given row index in pixels. */
  yForRow: (row: number) => number;
  /** The minimum date (epoch ms) across all items. */
  minDate: number;
  /** The maximum date (epoch ms) across all items. */
  maxDate: number;
  /** Total chart width in pixels. */
  chartWidth: number;
  /** Total chart height in pixels. */
  chartHeight: number;
  /** Day width in pixels. */
  dayWidth: number;
  /** Row height in pixels. */
  rowHeight: number;
  /** Left margin for labels. */
  leftMargin: number;
}

/**
 * Compute layout metrics from a set of Gantt items.
 *
 * @param items - All tasks and milestones in the diagram
 * @param sections - Sections that group items
 * @returns Layout metrics for positioning elements
 */
export function computeLayoutMetrics(
  items: readonly (GanttTask | GanttMilestone)[],
  sections: readonly GanttSection[]
): GanttLayoutMetrics {
  const allDates: number[] = [];

  for (const item of items) {
    if (item.kind === "task") {
      allDates.push(parseDate(item.startDate), parseDate(item.endDate));
    } else {
      allDates.push(parseDate(item.date));
    }
  }

  // Ensure at least some range even with no items
  const minDate = allDates.length > 0 ? Math.min(...allDates) : Date.UTC(2025, 0, 1);
  const maxDate = allDates.length > 0 ? Math.max(...allDates) : Date.UTC(2025, 0, 31);
  const totalDays = Math.max(1, Math.round((maxDate - minDate) / MS_PER_DAY));

  const sectionCount = sections.length;
  const rowCount = items.length + sectionCount;
  const chartWidth = LEFT_MARGIN + totalDays * DAY_WIDTH + 40;
  const chartHeight = TOP_MARGIN + HEADER_HEIGHT + rowCount * ROW_HEIGHT + 20;

  const minDateTs = minDate;

  return {
    xForDate: (dateIso: string) =>
      LEFT_MARGIN + ((parseDate(dateIso) - minDateTs) / MS_PER_DAY) * DAY_WIDTH,
    yForRow: (row: number) => TOP_MARGIN + HEADER_HEIGHT + row * ROW_HEIGHT,
    minDate,
    maxDate,
    chartWidth,
    chartHeight,
    dayWidth: DAY_WIDTH,
    rowHeight: ROW_HEIGHT,
    leftMargin: LEFT_MARGIN,
  };
}

/** Compile a Gantt task into positioned DiagramNodes. */
export function compileTaskLayout(
  task: GanttTask,
  rowIndex: number,
  metrics: GanttLayoutMetrics
): DiagramNode {
  const x = metrics.xForDate(task.startDate);
  const endX = metrics.xForDate(task.endDate);
  const width = Math.max(metrics.dayWidth, endX - x);
  const y = metrics.yForRow(rowIndex);

  return {
    id: task.id,
    kind: "gantt-task",
    label: task.name,
    shape: { type: "rect" },
    layout: {
      width,
      height: TASK_BAR_HEIGHT,
      minWidth: metrics.dayWidth,
    },
    metadata: {
      x,
      y: y + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2,
      startDate: task.startDate,
      endDate: task.endDate,
      ...(task.progress !== undefined ? { progress: task.progress } : {}),
    },
  };
}

/** Compile a Gantt milestone into a positioned DiagramNode. */
export function compileMilestoneLayout(
  milestone: GanttMilestone,
  rowIndex: number,
  metrics: GanttLayoutMetrics
): DiagramNode {
  const x = metrics.xForDate(milestone.date);
  const y = metrics.yForRow(rowIndex);

  return {
    id: milestone.id,
    kind: "gantt-milestone",
    label: milestone.name,
    shape: { type: "diamond" },
    layout: {
      width: MILESTONE_SIZE,
      height: MILESTONE_SIZE,
    },
    metadata: {
      x: x - MILESTONE_SIZE / 2,
      y: y + (ROW_HEIGHT - MILESTONE_SIZE) / 2,
      date: milestone.date,
    },
  };
}

/** Compile a Gantt section header into a positioned DiagramNode. */
export function compileSectionLayout(
  section: GanttSection,
  rowIndex: number,
  metrics: GanttLayoutMetrics
): DiagramNode {
  const y = metrics.yForRow(rowIndex);

  return {
    id: section.id,
    kind: "gantt-section",
    label: section.title,
    shape: { type: "rect" },
    layout: {
      width: metrics.chartWidth,
      height: SECTION_HEADER_HEIGHT,
    },
    metadata: {
      x: 0,
      y,
    },
  };
}

/** Create a dependency edge between two elements. */
export function compileDependencyEdge(
  edgeId: string,
  sourceId: string,
  targetId: string
): DiagramEdge {
  return {
    id: edgeId,
    kind: "dependency",
    sourceId,
    targetId,
    direction: "forward",
  };
}
