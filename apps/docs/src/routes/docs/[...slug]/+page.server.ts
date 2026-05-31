import { error } from "@sveltejs/kit";
import { getNavItems, getPageData } from "$lib/doc-content";

export function entries() {
  const slugs = new Set<string>();
  for (const item of getNavItems()) {
    slugs.add(item.slug);
    const [section] = item.slug.split("/");
    if (section !== undefined && section !== item.slug) slugs.add(section);
  }
  return [...slugs].map((slug) => ({ slug }));
}

export function load({ params }) {
  const slug = params.slug;
  if (slug === undefined) {
    error(404, "Documentation page not found");
  }

  const page = getPageData(slug);
  if (page === undefined) {
    error(404, `Documentation page not found: ${slug}`);
  }

  return {
    title: page.title,
    description: page.description ?? "",
    html: page.html,
  };
}
