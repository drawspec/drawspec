import { type DocNavItem, getNavItems } from "./doc-content";

export interface GroupedNavItem {
  slug: string;
  title: string;
  description?: string;
}

export interface GroupedNavSubSection {
  title: string;
  items: GroupedNavItem[];
}

const sectionLabels: Record<string, string> = {
  "cli-reference": "Reference",
  examples: "Examples",
  "getting-started": "Guides",
  guides: "Guides",
  reference: "Reference",
};

const sectionOrder = ["Guides", "Reference", "Examples"];

const subSectionMap: Record<string, Record<string, string>> = {
  guides: {
    "getting-started": "Getting Started",
    "architecture-c4": "Diagram Types",
    "sequence-diagrams": "Diagram Types",
    "class-diagrams": "Diagram Types",
    "state-diagrams": "Diagram Types",
    "activity-diagrams": "Diagram Types",
    "component-diagrams": "Diagram Types",
    "deployment-diagrams": "Diagram Types",
    "vite-plugin": "Integration",
    "ci-integration": "Integration",
    lsp: "Integration",
    "layout-and-rendering": "Advanced",
    validation: "Advanced",
    exporters: "Advanced",
    "programmatic-usage": "Advanced",
  },
  examples: {
    "basic-sequence": "Sequence Diagrams",
    "sequence-advanced": "Sequence Diagrams",
    "sequence-fragments": "Sequence Diagrams",
    "chat-system": "Sequence Diagrams",
    "basic-class": "Class Diagrams",
    "class-advanced": "Class Diagrams",
    "basic-state": "State Diagrams",
    "state-advanced": "State Diagrams",
    "basic-activity": "Activity Diagrams",
    "activity-advanced": "Activity Diagrams",
    "basic-component": "Component Diagrams",
    "component-advanced": "Component Diagrams",
    "basic-deployment": "Deployment Diagrams",
    "deployment-advanced": "Deployment Diagrams",
    "c4-context-view": "Architecture",
    "c4-container-view": "Architecture",
    "c4-dynamic": "Architecture",
    "c4-deployment": "Architecture",
    "aws-serverless": "Use Cases",
    "microservices-orders": "Use Cases",
    "cicd-pipeline": "Use Cases",
  },
};

/**
 * Group doc nav items by section.
 */
export function getGroupedNav(): [string, GroupedNavItem[]][] {
  const groups = new Map<string, GroupedNavItem[]>();
  for (const item of getNavItems()) {
    const label = sectionLabel(item);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)?.push({
      slug: item.slug,
      title: item.title,
      ...(item.description !== undefined ? { description: item.description } : {}),
    });
  }

  return [...groups.entries()].sort(
    ([left], [right]) => sectionRank(left) - sectionRank(right) || left.localeCompare(right)
  );
}

/**
 * Group doc nav items by section with nested sub-sections.
 */
export function getGroupedNavWithSubSections(): [string, GroupedNavSubSection[]][] {
  const groups = getGroupedNav();

  return groups.map(([section, items]) => {
    const sectionKey =
      [...Object.entries(sectionLabels)].reverse().find(([, label]) => label === section)?.[0] ??
      section.toLowerCase();

    const sectionMap = subSectionMap[sectionKey];
    const subGroups = new Map<string, GroupedNavItem[]>();

    for (const item of items) {
      const leafSlug = item.slug.split("/").pop() ?? item.slug;
      const subTitle = sectionMap?.[leafSlug] ?? "General";
      if (!subGroups.has(subTitle)) {
        subGroups.set(subTitle, []);
      }
      subGroups.get(subTitle)?.push(item);
    }

    const subSections: GroupedNavSubSection[] = [...subGroups.entries()].map(
      ([title, subItems]) => ({ title, items: subItems })
    );

    // Flatten if only one sub-section
    if (subSections.length === 1) {
      const only = subSections[0];
      return [section, [{ title: only.title, items: only.items }]] as [
        string,
        GroupedNavSubSection[],
      ];
    }

    return [section, subSections] as [string, GroupedNavSubSection[]];
  });
}

/**
 * Resolve a slug array to a single slug string.
 */
export function resolveSlug(slugParts: string[]): string {
  return slugParts.join("/");
}

/**
 * Check if a slug is a known doc page.
 */
export function isKnownSlug(slug: string): boolean {
  return getNavItems().some((item) => item.slug === slug);
}

function sectionLabel(item: DocNavItem): string {
  const section = item.section ?? item.slug.split("/")[0] ?? item.slug;
  return sectionLabels[section] ?? titleCase(section);
}

function sectionRank(section: string): number {
  const index = sectionOrder.indexOf(section);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
