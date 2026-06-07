import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import type { GanttMilestone, GanttTask } from "../index";
import { compile, ganttDiagram, MutableGanttBuilder } from "../index";
import { computeLayoutMetrics } from "../layout";

function planningTask(): GanttTask {
  return {
    id: "gtask_a1b2c3d4",
    kind: "task",
    name: "Planning",
    startDate: "2025-01-01",
    endDate: "2025-01-15",
  };
}

function devTask(): GanttTask {
  return {
    id: "gtask_e5f6g7h8",
    kind: "task",
    name: "Development",
    startDate: "2025-01-16",
    endDate: "2025-02-28",
    dependencies: ["gtask_a1b2c3d4"],
  };
}

function alphaMilestone(): GanttMilestone {
  return {
    id: "gmile_i9j0k1l2",
    kind: "milestone",
    name: "Alpha Release",
    date: "2025-03-01",
  };
}

async function ganttSvg(): Promise<string> {
  const document = ganttDiagram("Sprint 1", (g) => {
    g.task("Planning", { startDate: "2025-01-01", endDate: "2025-01-15" });
    g.task("Development", { startDate: "2025-01-16", endDate: "2025-02-28", progress: 60 });
    g.milestone("Alpha Release", "2025-03-01");
  });
  const positionedDiagram = await simpleGraphLayout().layout(document, { direction: "LR" });
  return renderSvg(document, { positionedDiagram });
}

async function expectGolden(name: string, svg: string): Promise<void> {
  const path = new URL(`./golden/${name}.svg`, import.meta.url).pathname;
  if (Bun.env.UPDATE_GOLDEN === "1") {
    await Bun.write(path, svg);
  }
  expect(await Bun.file(path).text()).toBe(svg);
}

describe("@drawspec/gantt", () => {
  test("compiles tasks to IR nodes with gantt-task kind", () => {
    const document = compile("Test", [planningTask()]);
    const taskNode = document.nodes[0];

    expect(document.kind).toBe("gantt");
    expect(taskNode?.kind).toBe("gantt-task");
    expect(taskNode?.label).toBe("Planning");
    expect(taskNode?.metadata?.startDate).toBe("2025-01-01");
    expect(taskNode?.metadata?.endDate).toBe("2025-01-15");
  });

  test("compiles milestones to IR nodes with gantt-milestone kind", () => {
    const document = compile("Test", [alphaMilestone()]);
    const milestoneNode = document.nodes[0];

    expect(milestoneNode?.kind).toBe("gantt-milestone");
    expect(milestoneNode?.label).toBe("Alpha Release");
    expect(milestoneNode?.shape?.type).toBe("diamond");
    expect(milestoneNode?.metadata?.date).toBe("2025-03-01");
  });

  test("compiles dependencies to IR edges", () => {
    const document = compile("Test", [planningTask(), devTask()]);
    const depEdge = document.edges[0];

    expect(document.edges).toHaveLength(1);
    expect(depEdge?.kind).toBe("dependency");
    expect(depEdge?.sourceId).toBe("gtask_a1b2c3d4");
    expect(depEdge?.targetId).toBe("gtask_e5f6g7h8");
    expect(depEdge?.direction).toBe("forward");
  });

  test("section grouping creates section header and item nodes", () => {
    const document = ganttDiagram("Test", (g) => {
      g.section("Phase 1", (s) => {
        s.task("Planning", { startDate: "2025-01-01", endDate: "2025-01-15" });
        s.milestone("Kickoff Done", "2025-01-16");
      });
    });

    const sectionNode = document.nodes.find((n) => n.kind === "gantt-section");
    const taskNode = document.nodes.find((n) => n.kind === "gantt-task");
    const milestoneNode = document.nodes.find((n) => n.kind === "gantt-milestone");

    expect(sectionNode?.label).toBe("Phase 1");
    expect(sectionNode?.kind).toBe("gantt-section");
    expect(taskNode?.label).toBe("Planning");
    expect(milestoneNode?.label).toBe("Kickoff Done");
    expect(document.nodes).toHaveLength(3);
  });

  test("ganttDiagram DSL produces complete document", () => {
    const document = ganttDiagram("Project", (g) => {
      g.task("Task A", { startDate: "2025-01-01", endDate: "2025-01-10" });
      g.task("Task B", {
        startDate: "2025-01-11",
        endDate: "2025-01-20",
        progress: 50,
      });
      g.milestone("Milestone 1", "2025-01-25");
    });

    expect(document.kind).toBe("gantt");
    expect(document.title).toBe("Project");
    expect(document.nodes).toHaveLength(3);
    expect(document.diagnostics).toEqual([]);
  });

  test("reports invalid dates", () => {
    const badTask: GanttTask = {
      id: "gtask_bad1",
      kind: "task",
      name: "Bad Dates",
      startDate: "not-a-date",
      endDate: "also-not-a-date",
    };
    const document = compile("Invalid", [badTask]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("gantt/invalid-date");
  });

  test("reports start date after end date", () => {
    const reversedTask: GanttTask = {
      id: "gtask_rev1",
      kind: "task",
      name: "Reversed",
      startDate: "2025-02-01",
      endDate: "2025-01-01",
    };
    const document = compile("Invalid", [reversedTask]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("gantt/start-after-end");
  });

  test("reports progress outside 0-100 range", () => {
    const overProgress: GanttTask = {
      id: "gtask_prog1",
      kind: "task",
      name: "Over Progress",
      startDate: "2025-01-01",
      endDate: "2025-01-15",
      progress: 150,
    };
    const document = compile("Invalid", [overProgress]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("gantt/invalid-progress");
  });

  test("reports unknown dependency references", () => {
    const withBadDep: GanttTask = {
      id: "gtask_dep1",
      kind: "task",
      name: "With Dep",
      startDate: "2025-01-01",
      endDate: "2025-01-15",
      dependencies: ["nonexistent_id"],
    };
    const document = compile("Invalid", [withBadDep]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("gantt/unknown-dependency");
  });

  test("reports circular dependencies", () => {
    const taskA: GanttTask = {
      id: "gtask_circ_a",
      kind: "task",
      name: "A",
      startDate: "2025-01-01",
      endDate: "2025-01-10",
      dependencies: ["gtask_circ_b"],
    };
    const taskB: GanttTask = {
      id: "gtask_circ_b",
      kind: "task",
      name: "B",
      startDate: "2025-01-11",
      endDate: "2025-01-20",
      dependencies: ["gtask_circ_a"],
    };
    const document = compile("Circular", [taskA, taskB]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("gantt/circular-dependency");
  });

  test("compiles deterministically", () => {
    const first = compile("Test", [planningTask(), devTask()]);
    const second = compile("Test", [planningTask(), devTask()]);

    expect(second).toEqual(first);
  });

  test("layout metrics compute correct positions", () => {
    const items = [planningTask()];
    const metrics = computeLayoutMetrics(items, []);

    const x = metrics.xForDate("2025-01-01");
    const endX = metrics.xForDate("2025-01-15");
    expect(x).toBeGreaterThan(0);
    expect(endX).toBeGreaterThan(x);
    expect(metrics.chartWidth).toBeGreaterThan(0);
    expect(metrics.chartHeight).toBeGreaterThan(0);
  });

  test("matches the Gantt diagram golden fixture", async () => {
    await expectGolden("gantt", await ganttSvg());
  });

  test("MutableGanttBuilder produces correct model", () => {
    const builder = new MutableGanttBuilder();
    builder.task("Task A", { startDate: "2025-01-01", endDate: "2025-01-10" });
    builder.milestone("M1", "2025-01-15");
    builder.section("Phase 1", (s) => {
      s.task("Task B", { startDate: "2025-02-01", endDate: "2025-02-15" });
    });

    expect(builder.items).toHaveLength(2);
    expect(builder.sections).toHaveLength(1);
    expect(builder.sections[0]?.items).toHaveLength(1);
    expect(builder.sections[0]?.title).toBe("Phase 1");
  });
});
