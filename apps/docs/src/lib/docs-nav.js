/** @type {{ slug: string; title: string; section: string }[]} */
export const docNav = [
  { slug: "getting-started", title: "Getting Started", section: "Guides" },
  { slug: "cli-reference", title: "CLI Reference", section: "Guides" },
  { slug: "api/core", title: "Core API", section: "API Reference" },
  { slug: "api/docs", title: "Docs Engine API", section: "API Reference" },
];

/**
 * Group doc nav items by section.
 * @returns {Map<string, { slug: string; title: string }[]>}
 */
export function getGroupedNav() {
  const groups = new Map();
  for (const item of docNav) {
    if (!groups.has(item.section)) {
      groups.set(item.section, []);
    }
    groups.get(item.section).push({ slug: item.slug, title: item.title });
  }
  return groups;
}

/**
 * Resolve a slug array to a single slug string.
 * @param {string[]} slugParts
 * @returns {string}
 */
export function resolveSlug(slugParts) {
  return slugParts.join("/");
}

/**
 * Check if a slug is a known doc page.
 * @param {string} slug
 * @returns {boolean}
 */
export function isKnownSlug(slug) {
  return docNav.some((item) => item.slug === slug);
}
