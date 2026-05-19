import type { Rule } from "../types";

export interface MaxNodesOptions {
  readonly max?: number;
}

export interface MaxEdgesOptions {
  readonly max?: number;
}

const DEFAULT_MAX_NODES = 100;
const DEFAULT_MAX_EDGES = 200;

export const maxNodesRule: Rule<MaxNodesOptions> = {
  name: "diagram/max-nodes",
  meta: {
    description: "Diagram must not exceed the configurable maximum number of nodes (default 100).",
    recommended: true,
    defaultSeverity: "warn",
  },
  create(context) {
    return {
      diagram(diagram) {
        const limit = context.config.options?.max ?? DEFAULT_MAX_NODES;
        if (diagram.nodes.length > limit) {
          context.report({
            message: `Diagram has ${diagram.nodes.length} nodes, exceeding the limit of ${limit}.`,
            target: { kind: "diagram", id: diagram.id },
            help: "Reduce the number of nodes or increase the configured limit.",
          });
        }
      },
    };
  },
};

export const maxEdgesRule: Rule<MaxEdgesOptions> = {
  name: "diagram/max-edges",
  meta: {
    description: "Diagram must not exceed the configurable maximum number of edges (default 200).",
    recommended: true,
    defaultSeverity: "warn",
  },
  create(context) {
    return {
      diagram(diagram) {
        const limit = context.config.options?.max ?? DEFAULT_MAX_EDGES;
        if (diagram.edges.length > limit) {
          context.report({
            message: `Diagram has ${diagram.edges.length} edges, exceeding the limit of ${limit}.`,
            target: { kind: "diagram", id: diagram.id },
            help: "Reduce the number of edges or increase the configured limit.",
          });
        }
      },
    };
  },
};

export const noFloatingNodeRule: Rule = {
  name: "diagram/no-floating-node",
  meta: {
    description: "Every node must be connected by at least one edge.",
    recommended: true,
    defaultSeverity: "warn",
  },
  create(context) {
    return {
      diagram(diagram) {
        const connected = new Set<string>();
        for (const edge of diagram.edges) {
          connected.add(edge.sourceId);
          connected.add(edge.targetId);
        }

        for (const node of diagram.nodes) {
          if (!connected.has(node.id)) {
            context.report({
              message: `Node '${node.label ?? node.id}' is not connected to any edge.`,
              ...(node.source === undefined ? {} : { source: node.source }),
              target: { kind: "node", id: node.id },
              help: "Add an edge that connects this node to another node.",
            });
          }
        }
      },
    };
  },
};

export const generalDiagramRules = [maxNodesRule, maxEdgesRule, noFloatingNodeRule] as const;
