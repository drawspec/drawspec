import { compileStateDocument, stateDocumentId } from "./compile";
import { final as baseFinal, initial as baseInitial } from "./pseudostate";
import { MutableStateElement } from "./state";
import type {
  PseudostateElement,
  StateBuilder,
  StateDiagramElement,
  StateDocument,
  StateDomainModel,
} from "./types";

export interface StateDiagramHelpers {
  readonly state: (
    name: string,
    callback?: (s: StateBuilder) => undefined | readonly unknown[]
  ) => StateDiagramElement;
  readonly initial: (name?: string) => PseudostateElement;
  readonly final: (name?: string) => PseudostateElement;
}

export function stateDiagram(
  title: string,
  callback: (helpers: StateDiagramHelpers) => readonly StateDiagramElement[]
): StateDocument;
export function stateDiagram(
  title: string
): (callback: (helpers: StateDiagramHelpers) => readonly StateDiagramElement[]) => StateDocument;
export function stateDiagram(
  title: string,
  callback?: (helpers: StateDiagramHelpers) => readonly StateDiagramElement[]
):
  | StateDocument
  | ((
      callback: (helpers: StateDiagramHelpers) => readonly StateDiagramElement[]
    ) => StateDocument) {
  const build = (
    elementsCallback: (helpers: StateDiagramHelpers) => readonly StateDiagramElement[]
  ): StateDocument => {
    const stateNameCounts = new Map<string, number>();
    const pseudostateNameCounts = new Map<string, number>();
    const helperElements = new Map<string, StateDiagramElement>();

    const helpers: StateDiagramHelpers = {
      state: (name, cb) => {
        const index = stateNameCounts.get(name) ?? 0;
        stateNameCounts.set(name, index + 1);
        const element = new MutableStateElement(name, index);
        cb?.(element);
        helperElements.set(element.id, element);
        return element;
      },
      initial: (name = "initial") => {
        const index = pseudostateNameCounts.get(`initial:${name}`) ?? 0;
        pseudostateNameCounts.set(`initial:${name}`, index + 1);
        const element = baseInitial(name, index);
        helperElements.set(element.id, element);
        return element;
      },
      final: (name = "final") => {
        const index = pseudostateNameCounts.get(`final:${name}`) ?? 0;
        pseudostateNameCounts.set(`final:${name}`, index + 1);
        const element = baseFinal(name, index);
        helperElements.set(element.id, element);
        return element;
      },
    };

    const result = elementsCallback(helpers);
    const elements: StateDiagramElement[] = [];
    const seen = new Set<string>();

    for (const item of result) {
      if (item !== null && item !== undefined && "transitions" in item) {
        const el = item as StateDiagramElement;
        if (!seen.has(el.id)) {
          seen.add(el.id);
          elements.push(el);
        }
      } else if (item !== null && item !== undefined && "transition" in item) {
        const transition = (item as { transition: { sourceId: string } }).transition;
        const sourceId = transition.sourceId;
        if (!seen.has(sourceId)) {
          const source = helperElements.get(sourceId);
          if (source !== undefined) {
            seen.add(sourceId);
            elements.push(source);
          }
        }
      }
    }

    const model: StateDomainModel = {
      id: stateDocumentId(title),
      title,
      elements,
    };
    return compileStateDocument(model);
  };

  return callback === undefined ? build : build(callback);
}
