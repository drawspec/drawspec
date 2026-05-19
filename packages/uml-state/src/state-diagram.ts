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

    const helpers: StateDiagramHelpers = {
      state: (name, cb) => {
        const index = stateNameCounts.get(name) ?? 0;
        stateNameCounts.set(name, index + 1);
        const element = new MutableStateElement(name, index);
        cb?.(element);
        return element;
      },
      initial: (name = "initial") => {
        const index = pseudostateNameCounts.get(`initial:${name}`) ?? 0;
        pseudostateNameCounts.set(`initial:${name}`, index + 1);
        return baseInitial(name, index);
      },
      final: (name = "final") => {
        const index = pseudostateNameCounts.get(`final:${name}`) ?? 0;
        pseudostateNameCounts.set(`final:${name}`, index + 1);
        return baseFinal(name, index);
      },
    };

    const model: StateDomainModel = {
      id: stateDocumentId(title),
      title,
      elements: elementsCallback(helpers),
    };
    return compileStateDocument(model);
  };

  return callback === undefined ? build : build(callback);
}
