import { error } from "@sveltejs/kit";
import { getNavItems, getPageData } from "$lib/doc-content";
import type { EntryGenerator, PageServerLoad } from "./$types";

export const entries: EntryGenerator = () => {
  const slugs = new Set<string>();
  for (const item of getNavItems()) {
    slugs.add(item.slug);
    const [section] = item.slug.split("/");
    if (section !== undefined && section !== item.slug) slugs.add(section);
  }
  return [...slugs].map((slug) => ({ slug }));
};

export const load: PageServerLoad = ({ params }) => {
  const slug = params.slug ?? "";

  const page = getPageData(slug);
  if (page === undefined) {
    throw error(404, `Documentation page not found: ${slug}`);
  }

  return {
    title: page.title,
    description: page.description,
    html: page.html,
  };
};
