import type { DiagramNode } from "@drawspec/core";
import { labelToPlainText } from "@drawspec/core";
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

const TYPE_DIAGRAM_KINDS = new Set(["class", "interface", "enum"]);

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
        const nodeById = new Map<string, DiagramNode>();
        for (const node of diagram.nodes) {
          nodeById.set(node.id, node);
        }

        // Build inheritance map: child id -> parent id
        // Inheritance is encoded as an "extends" edge.
        const extendsMap = new Map<string, string>();
        for (const edge of diagram.edges) {
          if (edge.kind === "extends") {
            extendsMap.set(edge.sourceId, edge.targetId);
          }
        }

        // Track node IDs that are part of an already-reported cycle.
        const reportedCycleNodes = new Set<string>();

        for (const node of diagram.nodes) {
          if (node.kind !== "class") continue;
          if (reportedCycleNodes.has(node.id)) continue;

          const path: string[] = [];
          const visited = new Set<string>();
          let current = node.id;

          while (extendsMap.has(current)) {
            if (visited.has(current)) {
              const cycleStart = current;
              const cycleIdx = path.indexOf(cycleStart);
              const cyclePath = cycleIdx >= 0 ? path.slice(cycleIdx) : path;
              cyclePath.push(cycleStart);
              // Mark all nodes in the cycle as reported to avoid duplicate diagnostics.
              for (const id of cyclePath) {
                reportedCycleNodes.add(id);
              }
              const cycleLabels = cyclePath.map((id) => nodeById.get(id)?.label ?? id).join(" -> ");
              context.report({
                message: `Circular inheritance detected: ${cycleLabels}.`,
                ...(node.source === undefined ? {} : { source: node.source }),
                target: { kind: "node", id: node.id },
                help: "Class inheritance must form an acyclic graph.",
              });
              break;
            }
            visited.add(current);
            path.push(current);
            const next = extendsMap.get(current);
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
          if (TYPE_DIAGRAM_KINDS.has(node.kind) && node.label) {
            knownTypes.add(labelToPlainText(node.label));
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
                message: `Unknown type reference '${typeName}' on '${node.label === undefined ? node.id : labelToPlainText(node.label)}'.`,
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
