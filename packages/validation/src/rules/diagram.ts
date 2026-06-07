import { type LabelContent, labelToPlainText } from "@drawspec/core";
import type { Rule } from "../types";

function isBlank(value: LabelContent | undefined): boolean {
  return value === undefined || labelToPlainText(value).trim().length === 0;
}

export const requireTitleRule: Rule = {
  name: "diagram/require-title",
  meta: {
    description: "Diagram documents must have a non-empty title.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      diagram(diagram) {
        if (isBlank(diagram.title)) {
          context.report({
            message: `Diagram '${diagram.id}' must have a title.`,
            target: { kind: "diagram", id: diagram.id },
            help: "Set the diagram title to a human-readable name.",
          });
        }
      },
    };
  },
};

export const noEmptyLabelRule: Rule = {
  name: "diagram/no-empty-label",
  meta: {
    description: "Diagram nodes and edges must not have empty labels.",
    recommended: false,
  },
  create(context) {
    return {
      diagramNode(node) {
        if (isBlank(node.label)) {
          context.report({
            message: `Diagram node '${node.id}' must have a label.`,
            ...(node.source === undefined ? {} : { source: node.source }),
            target: { kind: "node", id: node.id },
          });
        }
      },
      diagramEdge(edge) {
        if (isBlank(edge.label)) {
          context.report({
            message: `Diagram edge '${edge.id}' must have a label.`,
            ...(edge.source === undefined ? {} : { source: edge.source }),
            target: { kind: "edge", id: edge.id },
          });
        }
      },
    };
  },
};

export const noDuplicateNodeIdRule: Rule = {
  name: "diagram/no-duplicate-node-id",
  meta: {
    description: "Diagram node IDs must be unique within a document.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      diagram(diagram) {
        const seen = new Set<string>();
        for (const node of diagram.nodes) {
          if (seen.has(node.id)) {
            context.report({
              message: `Duplicate diagram node ID '${node.id}'.`,
              ...(node.source === undefined ? {} : { source: node.source }),
              target: { kind: "node", id: node.id },
              help: "Node IDs must be unique within one diagram document.",
            });
          } else {
            seen.add(node.id);
          }
        }
      },
    };
  },
};

export const diagramRules = [requireTitleRule, noEmptyLabelRule, noDuplicateNodeIdRule] as const;
