import type { DiagramNode } from "@drawspec/core";
import type { Rule } from "../types";

// ---------------------------------------------------------------------------
// Structural types for class node metadata.
// These mirror the shapes produced by @drawspec/uml-class compileNode() but
// are decoded from the generic `metadata` bag so the validation package
// remains independent of the class diagram package.
// ---------------------------------------------------------------------------

interface ClassMemberLike {
  readonly name: string;
  readonly id?: string;
}

interface ClassFieldLike extends ClassMemberLike {
  readonly type?: string;
  readonly visibility?: string;
}

interface ClassMethodLike extends ClassMemberLike {
  readonly visibility?: string;
  readonly returnType?: string;
  readonly parameters?: readonly { readonly type: string }[];
}

interface ClassNodeMetadata {
  readonly fields?: readonly ClassFieldLike[];
  readonly methods?: readonly ClassMethodLike[];
  readonly abstract?: boolean;
}

const PRIMITIVE_TYPES = new Set(["boolean", "number", "string", "void", "unknown", "null"]);

function isClassNode(node: DiagramNode): boolean {
  return node.kind === "class";
}

function isClassOrInterfaceNode(node: DiagramNode): boolean {
  return node.kind === "class" || node.kind === "interface";
}

function getClassMeta(node: DiagramNode): ClassNodeMetadata {
  return (node.metadata ?? {}) as ClassNodeMetadata;
}

// ---------------------------------------------------------------------------
// no-circular-inheritance
// ---------------------------------------------------------------------------

export const noCircularInheritanceRule: Rule = {
  name: "class/no-circular-inheritance",
  meta: {
    description: "Class inheritance chains must not form cycles.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      diagram(diagram) {
        const classNodes = diagram.nodes.filter(isClassNode);
        const byLabel = new Map<string, DiagramNode>();
        for (const node of classNodes) {
          if (node.label) {
            byLabel.set(node.label, node);
          }
        }

        // Build inheritance map: child label -> parent label
        // Inheritance is encoded as an "extends" edge.
        const inheritanceEdges = diagram.edges.filter((edge) => edge.kind === "extends");
        const edgeMap = new Map<string, string>();
        for (const edge of inheritanceEdges) {
          const sourceNode = diagram.nodes.find((n) => n.id === edge.sourceId);
          const targetNode = diagram.nodes.find((n) => n.id === edge.targetId);
          if (sourceNode?.label && targetNode?.label) {
            edgeMap.set(sourceNode.label, targetNode.label);
          }
        }

        for (const node of classNodes) {
          const startLabel = node.label;
          if (!startLabel) continue;

          const path: string[] = [];
          const visited = new Set<string>();
          let current = startLabel;

          while (edgeMap.has(current)) {
            if (visited.has(current)) {
              path.push(current);
              context.report({
                message: `Circular inheritance detected: ${path.join(" -> ")}.`,
                target: { kind: "node", id: node.id },
                help: "Class inheritance must form an acyclic graph.",
              });
              break;
            }
            visited.add(current);
            path.push(current);
            const next = edgeMap.get(current);
            if (next === undefined) break;
            current = next;
          }
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// no-duplicate-member
// ---------------------------------------------------------------------------

export const noDuplicateMemberRule: Rule = {
  name: "class/no-duplicate-member",
  meta: {
    description: "Class members (fields and methods) must have unique names.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      diagramNode(node) {
        if (!isClassNode(node)) return;
        const meta = getClassMeta(node);
        const allMembers: readonly ClassMemberLike[] = [
          ...(meta.fields ?? []),
          ...(meta.methods ?? []),
        ];

        const seen = new Map<string, string>();
        for (const member of allMembers) {
          const existing = seen.get(member.name);
          if (existing !== undefined) {
            context.report({
              message: `Duplicate member '${member.name}' in class '${node.label ?? node.id}'.`,
              target: { kind: "node", id: node.id },
              help: `Member names must be unique within a class. First declaration: ${existing}.`,
            });
          } else {
            seen.set(member.name, member.id ?? member.name);
          }
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// no-unknown-type-ref
// ---------------------------------------------------------------------------

export const noUnknownTypeRefRule: Rule = {
  name: "class/no-unknown-type-ref",
  meta: {
    description:
      "Field types, return types, and parameter types must reference known classes or primitives.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      diagram(diagram) {
        const knownTypes = new Set<string>();
        for (const node of diagram.nodes) {
          if (node.label) {
            knownTypes.add(node.label);
          }
        }

        for (const node of diagram.nodes) {
          if (!isClassOrInterfaceNode(node)) continue;
          const meta = getClassMeta(node);
          const referencedTypes: string[] = [];

          for (const field of meta.fields ?? []) {
            if (field.type) referencedTypes.push(field.type);
          }
          for (const method of meta.methods ?? []) {
            if (method.returnType) referencedTypes.push(method.returnType);
            for (const param of method.parameters ?? []) {
              referencedTypes.push(param.type);
            }
          }

          for (const typeName of referencedTypes) {
            if (!PRIMITIVE_TYPES.has(typeName) && !knownTypes.has(typeName)) {
              context.report({
                message: `Unknown type reference '${typeName}' on '${node.label ?? node.id}'.`,
                target: { kind: "node", id: node.id },
                help: "Reference another class, interface, enum, or a primitive type.",
              });
            }
          }
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// require-visibility
// ---------------------------------------------------------------------------

export const requireVisibilityRule: Rule = {
  name: "class/require-visibility",
  meta: {
    description: "Methods on classes and interfaces must declare visibility.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      diagramNode(node) {
        if (!isClassOrInterfaceNode(node)) return;
        const meta = getClassMeta(node);

        for (const method of meta.methods ?? []) {
          if (!method.visibility) {
            context.report({
              message: `Method '${method.name}' on '${node.label ?? node.id}' must declare visibility.`,
              target: { kind: "node", id: node.id },
              help: "Pass { visibility: 'public' | 'protected' | 'private' | 'package' } to the method.",
            });
          }
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Aggregated export
// ---------------------------------------------------------------------------

export const classRules = [
  noCircularInheritanceRule,
  noDuplicateMemberRule,
  noUnknownTypeRefRule,
  requireVisibilityRule,
] as const;
