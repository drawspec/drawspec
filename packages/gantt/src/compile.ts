import {
  createDeterministicId,
  createDiagnostic,
  type Diagnostic,
  type DiagramEdge,
  type DiagramNode,
  IdRegistry,
} from "@drawspec/core";
import {
  compileDependencyEdge,
  compileMilestoneLayout,
  compileSectionLayout,
  compileTaskLayout,
  computeLayoutMetrics,
} from "./layout";
import type { GanttDocument, GanttDomainModel, GanttMilestone, GanttTask } from "./types";

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function register(registry: IdRegistry, id: string, diagnostics: Diagnostic[]): void {
  const diagnostic = registry.registerId(id);
  if (diagnostic) {
    diagnostics.push(diagnostic);
  }
}

/** Validate date strings are parseable and start <= end for tasks. */
function validateDates(
  items: readonly (GanttTask | GanttMilestone)[],
  diagnostics: Diagnostic[]
): void {
  for (const item of items) {
    if (item.kind === "task") {
      const start = new Date(item.startDate).getTime();
      const end = new Date(item.endDate).getTime();
      if (Number.isNaN(start)) {
        diagnostics.push(
          createDiagnostic({
            code: "gantt/invalid-date",
            severity: "error",
            message: `Invalid startDate '${item.startDate}' for task '${item.name}'.`,
            target: item.id,
            help: "Use ISO date format (YYYY-MM-DD).",
          })
        );
      }
      if (Number.isNaN(end)) {
        diagnostics.push(
          createDiagnostic({
            code: "gantt/invalid-date",
            severity: "error",
            message: `Invalid endDate '${item.endDate}' for task '${item.name}'.`,
            target: item.id,
            help: "Use ISO date format (YYYY-MM-DD).",
          })
        );
      }
      if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
        diagnostics.push(
          createDiagnostic({
            code: "gantt/start-after-end",
            severity: "error",
            message: `Task '${item.name}' has startDate after endDate.`,
            target: item.id,
            help: "Ensure startDate is before or equal to endDate.",
          })
        );
      }
    } else {
      const date = new Date(item.date).getTime();
      if (Number.isNaN(date)) {
        diagnostics.push(
          createDiagnostic({
            code: "gantt/invalid-date",
            severity: "error",
            message: `Invalid date '${item.date}' for milestone '${item.name}'.`,
            target: item.id,
            help: "Use ISO date format (YYYY-MM-DD).",
          })
        );
      }
    }
  }
}

/** Validate that task progress is in the 0-100 range. */
function validateProgress(
  items: readonly (GanttTask | GanttMilestone)[],
  diagnostics: Diagnostic[]
): void {
  for (const item of items) {
    if (item.kind === "task" && item.progress !== undefined) {
      if (item.progress < 0 || item.progress > 100) {
        diagnostics.push(
          createDiagnostic({
            code: "gantt/invalid-progress",
            severity: "error",
            message: `Task '${item.name}' has progress ${item.progress}, expected 0-100.`,
            target: item.id,
            help: "Progress must be between 0 and 100 inclusive.",
          })
        );
      }
    }
  }
}

/** Detect circular dependencies using DFS. */
function validateCircularDependencies(
  items: readonly (GanttTask | GanttMilestone)[],
  diagnostics: Diagnostic[]
): void {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string, path: string[]): boolean {
    if (visited.has(id)) {
      return false;
    }
    if (visiting.has(id)) {
      const cycleStart = path.indexOf(id);
      const cycle = path.slice(cycleStart).map((pid) => {
        const item = itemMap.get(pid);
        return item?.name ?? pid;
      });
      diagnostics.push(
        createDiagnostic({
          code: "gantt/circular-dependency",
          severity: "error",
          message: `Circular dependency detected: ${cycle.join(" → ")} → ${itemMap.get(id)?.name ?? id}.`,
          target: id,
          help: "Remove one of the dependencies to break the cycle.",
        })
      );
      return true;
    }
    visiting.add(id);
    path.push(id);
    const item = itemMap.get(id);
    if (item?.dependencies) {
      for (const depId of item.dependencies) {
        if (visit(depId, path)) {
          return true;
        }
      }
    }
    path.pop();
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  for (const item of items) {
    visit(item.id, []);
  }
}

/** Validate dependency references point to existing items. */
function validateDependencyRefs(
  items: readonly (GanttTask | GanttMilestone)[],
  diagnostics: Diagnostic[]
): void {
  const knownIds = new Set(items.map((item) => item.id));
  for (const item of items) {
    if (item.dependencies) {
      for (const depId of item.dependencies) {
        if (!knownIds.has(depId)) {
          diagnostics.push(
            createDiagnostic({
              code: "gantt/unknown-dependency",
              severity: "error",
              message: `${item.kind === "task" ? "Task" : "Milestone"} '${item.name}' references unknown dependency '${depId}'.`,
              target: item.id,
              help: "Ensure all dependency IDs reference existing tasks or milestones.",
            })
          );
        }
      }
    }
  }
}

/** Collect all flat items (standalone + section items) in row order. */
function collectAllItems(model: GanttDomainModel): {
  allItems: (GanttTask | GanttMilestone)[];
  rowAssignments: Map<string, number>;
} {
  const allItems: (GanttTask | GanttMilestone)[] = [];
  const rowAssignments = new Map<string, number>();
  let row = 0;

  // Process standalone items first
  for (const item of model.items) {
    allItems.push(item);
    rowAssignments.set(item.id, row);
    row++;
  }

  // Process section items
  for (const section of model.sections) {
    rowAssignments.set(section.id, row);
    row++;
    for (const sectionItem of section.items) {
      allItems.push(sectionItem);
      rowAssignments.set(sectionItem.id, row);
      row++;
    }
  }

  return { allItems, rowAssignments };
}

/**
 * Compile a Gantt domain model into a DiagramDocument IR.
 *
 * @param model - The Gantt domain model containing tasks, milestones, and sections
 * @returns A compiled GanttDocument ready for layout and rendering
 */
export function compileGanttDocument(model: GanttDomainModel): GanttDocument {
  const diagnostics: Diagnostic[] = [];
  const registry = new IdRegistry();

  const { allItems, rowAssignments } = collectAllItems(model);
  const metrics = computeLayoutMetrics(allItems, model.sections);

  // Compile nodes
  const nodes: DiagramNode[] = [];

  // Standalone items
  for (const item of model.items) {
    const row = rowAssignments.get(item.id) ?? 0;
    nodes.push(
      item.kind === "task"
        ? compileTaskLayout(item as GanttTask, row, metrics)
        : compileMilestoneLayout(item as GanttMilestone, row, metrics)
    );
  }

  // Section headers and section items
  for (const section of model.sections) {
    const sectionRow = rowAssignments.get(section.id) ?? 0;
    nodes.push(compileSectionLayout(section, sectionRow, metrics));

    for (const sectionItem of section.items) {
      const itemRow = rowAssignments.get(sectionItem.id) ?? 0;
      nodes.push(
        sectionItem.kind === "task"
          ? compileTaskLayout(sectionItem as GanttTask, itemRow, metrics)
          : compileMilestoneLayout(sectionItem as GanttMilestone, itemRow, metrics)
      );
    }
  }

  nodes.sort(byId);

  // Compile dependency edges
  const itemById = new Map(allItems.map((item) => [item.id, item]));
  const edges: DiagramEdge[] = [];

  for (const item of allItems) {
    if (item.dependencies) {
      for (const depId of item.dependencies) {
        const sourceItem = itemById.get(depId);
        if (sourceItem) {
          const edgeId = createDeterministicId(["gantt-dep", depId, item.id], {
            prefix: "gdep",
            length: 8,
          });
          edges.push(compileDependencyEdge(edgeId, depId, item.id));
        }
      }
    }
  }

  edges.sort(byId);

  // Register IDs
  register(registry, model.id, diagnostics);
  for (const node of nodes) {
    register(registry, node.id, diagnostics);
  }
  for (const edge of edges) {
    register(registry, edge.id, diagnostics);
  }

  // Validations
  validateDates(allItems, diagnostics);
  validateProgress(allItems, diagnostics);
  validateDependencyRefs(allItems, diagnostics);
  validateCircularDependencies(allItems, diagnostics);

  return {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "gantt",
    nodes,
    edges,
    groups: [],
    annotations: [],
    diagnostics,
    metadata: {
      minDate: metrics.minDate,
      maxDate: metrics.maxDate,
      chartWidth: metrics.chartWidth,
      chartHeight: metrics.chartHeight,
    },
  };
}

/**
 * Compile Gantt items directly into a DiagramDocument IR.
 *
 * @param title - Diagram title
 * @param items - Array of tasks and milestones
 * @param sections - Array of sections grouping items
 * @returns A compiled GanttDocument
 *
 * @example
 * ```ts
 * compile("Sprint 1", [task1, task2], [section1])
 * ```
 */
export function compile(
  title: string,
  items: readonly (GanttTask | GanttMilestone)[] = [],
  sections: readonly GanttDomainModel["sections"][number][] = []
): GanttDocument {
  return compileGanttDocument({
    id: createDeterministicId(["gantt-document", title], { prefix: "gdoc", length: 8 }),
    title,
    items: [...items],
    sections: [...sections],
  });
}
