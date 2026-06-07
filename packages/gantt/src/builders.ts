import { createDeterministicId } from "@drawspec/core";
import type {
  GanttDiagramBuilderApi,
  GanttDomainModel,
  GanttMilestone,
  GanttSection,
  GanttTask,
  SectionBuilderApi,
  TaskOptions,
} from "./types";

/** Mutable builder for constructing Gantt tasks. */
export class MutableGanttBuilder implements GanttDiagramBuilderApi {
  #items: (GanttTask | GanttMilestone)[] = [];
  #sections: GanttSection[] = [];
  #counter = 0;

  /** Get all standalone items. */
  get items(): readonly (GanttTask | GanttMilestone)[] {
    return this.#items;
  }

  /** Get all sections. */
  get sections(): readonly GanttSection[] {
    return this.#sections;
  }

  /** Define a standalone task. */
  task(name: string, options: TaskOptions): void {
    this.#counter++;
    const task: GanttTask = {
      id: createDeterministicId(
        ["gantt-task", name, options.startDate, options.endDate, this.#counter],
        { prefix: "gtask", length: 8 }
      ),
      kind: "task",
      name,
      startDate: options.startDate,
      endDate: options.endDate,
      ...(options.progress !== undefined ? { progress: options.progress } : {}),
      ...(options.dependencies ? { dependencies: [...options.dependencies] } : {}),
    };
    this.#items.push(task);
  }

  /** Define a standalone milestone. */
  milestone(name: string, date: string): void {
    this.#counter++;
    const milestone: GanttMilestone = {
      id: createDeterministicId(["gantt-milestone", name, date, this.#counter], {
        prefix: "gmile",
        length: 8,
      }),
      kind: "milestone",
      name,
      date,
    };
    this.#items.push(milestone);
  }

  /** Define a section that groups tasks and milestones. */
  section(title: string, callback: (api: SectionBuilderApi) => void): void {
    this.#counter++;
    const sectionItems: (GanttTask | GanttMilestone)[] = [];
    let itemCounter = 0;

    const api: SectionBuilderApi = {
      task: (name: string, options: TaskOptions) => {
        itemCounter++;
        sectionItems.push({
          id: createDeterministicId(
            ["gantt-task", title, name, options.startDate, options.endDate, itemCounter],
            { prefix: "gtask", length: 8 }
          ),
          kind: "task",
          name,
          startDate: options.startDate,
          endDate: options.endDate,
          ...(options.progress !== undefined ? { progress: options.progress } : {}),
          ...(options.dependencies ? { dependencies: [...options.dependencies] } : {}),
        });
      },
      milestone: (name: string, date: string) => {
        itemCounter++;
        sectionItems.push({
          id: createDeterministicId(["gantt-milestone", title, name, date, itemCounter], {
            prefix: "gmile",
            length: 8,
          }),
          kind: "milestone",
          name,
          date,
        });
      },
    };

    callback(api);

    this.#sections.push({
      id: createDeterministicId(["gantt-section", title, this.#counter], {
        prefix: "gsec",
        length: 8,
      }),
      kind: "section",
      title,
      items: sectionItems,
    });
  }

  /** Convert builder state to a GanttDomainModel. */
  toModel(title: string): GanttDomainModel {
    return {
      id: createDeterministicId(["gantt-document", title], { prefix: "gdoc", length: 8 }),
      title,
      items: [...this.#items],
      sections: [...this.#sections],
    };
  }
}
