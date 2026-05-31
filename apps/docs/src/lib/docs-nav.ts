import { type DocNavItem, getNavItems } from "./doc-content";

export interface GroupedNavItem {
  slug: string;
  title: string;
  description?: string;
}

const sectionLabels: Record<string, string> = {
  "cli-reference": "Reference",
  examples: "Examples",
  "getting-started": "Guides",
  guides: "Guides",
  reference: "Reference",
};

const sectionOrder = ["Guides", "Reference", "Examples"];

/**
 * Group doc nav items by section.
 */
export function getGroupedNav() {
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
