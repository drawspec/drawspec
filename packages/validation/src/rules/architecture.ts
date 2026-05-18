import type {
  ArchitectureElementLike,
  ArchitectureModelLike,
  ArchitectureViewLike,
  Rule,
} from "../types";

function hasTag(element: ArchitectureElementLike, tag: string): boolean {
  return (element.tags ?? []).includes(tag) || element.kind === tag;
}

function viewItems(model: ArchitectureModelLike): readonly ArchitectureViewLike[] {
  if (model.views === undefined) {
    return [];
  }
  return "items" in model.views ? model.views.items : model.views;
}

export const requireTechnologyRule: Rule = {
  name: "architecture/require-technology",
  meta: {
    description: "Containers and databases must specify the technology they use.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      architectureElement(element) {
        if (
          (element.kind === "container" || element.kind === "database") &&
          !element.technology?.trim()
        ) {
          context.report({
            message: `${element.kind} '${element.name}' must specify technology.`,
            target: { kind: "element", id: element.id },
            help: "Pass a non-empty technology option when declaring the element.",
          });
        }
      },
    };
  },
};

export const noFrontendToDatabaseRule: Rule = {
  name: "architecture/no-frontend-to-database",
  meta: {
    description: "Frontend elements must not connect directly to databases.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      architectureRelationship(relationship) {
        if (hasTag(relationship.source, "frontend") && hasTag(relationship.target, "database")) {
          context.report({
            message: `Frontend '${relationship.source.name}' must not connect directly to database '${relationship.target.name}'.`,
            target: { kind: "relationship", id: relationship.id },
            help: "Route frontend database access through an API or backend container.",
          });
        }
      },
    };
  },
};

export const noOrphanElementsRule: Rule = {
  name: "architecture/no-orphan-elements",
  meta: {
    description:
      "Architecture elements must participate in a relationship or be included in a view.",
    recommended: true,
    defaultSeverity: "warn",
  },
  create(context) {
    return {
      architectureModel(model) {
        const connected = new Set<string>();
        for (const relationship of model.relationships) {
          connected.add(relationship.source.id);
          connected.add(relationship.target.id);
        }

        const included = new Set<string>();
        for (const view of viewItems(model)) {
          for (const element of view.includedElements ?? []) {
            included.add(element.id);
          }
        }

        for (const element of model.elements) {
          if (!connected.has(element.id) && !included.has(element.id)) {
            context.report({
              message: `Architecture element '${element.name}' is orphaned.`,
              target: { kind: "element", id: element.id },
              help: "Add a relationship for this element or include it in a view.",
            });
          }
        }
      },
    };
  },
};

export const noDuplicateNamesInScopeRule: Rule = {
  name: "architecture/no-duplicate-names-in-scope",
  meta: {
    description: "Architecture element names must be unique among siblings.",
    recommended: true,
    defaultSeverity: "error",
  },
  create(context) {
    return {
      architectureModel(model) {
        const seen = new Map<string, ArchitectureElementLike>();

        for (const element of model.elements) {
          const parentId = element.parent?.id ?? "<root>";
          const key = `${parentId}\u0000${element.name.trim().toLocaleLowerCase()}`;
          const previous = seen.get(key);
          if (previous !== undefined) {
            context.report({
              message: `Duplicate architecture element name '${element.name}' in the same scope.`,
              target: { kind: "element", id: element.id },
              help: `Rename this element or '${previous.name}' so names are unique among siblings.`,
            });
          } else {
            seen.set(key, element);
          }
        }
      },
    };
  },
};

export const architectureRules = [
  requireTechnologyRule,
  noFrontendToDatabaseRule,
  noOrphanElementsRule,
  noDuplicateNamesInScopeRule,
] as const;
