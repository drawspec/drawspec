import { compileStateDocument, stateDocumentId } from "./compile";
import { final, initial } from "./pseudostate";
import { state } from "./state";
import type { StateDiagramElement, StateDocument, StateDomainModel } from "./types";

export interface StateDiagramHelpers {
  readonly state: typeof state;
  readonly initial: typeof initial;
  readonly final: typeof final;
}

const helpers: StateDiagramHelpers = { final, initial, state };

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
    const model: StateDomainModel = {
      id: stateDocumentId(title),
      title,
      elements: elementsCallback(helpers),
    };
    return compileStateDocument(model);
  };

  return callback === undefined ? build : build(callback);
}
