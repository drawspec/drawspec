import { error } from "@sveltejs/kit";
import { isKnownSlug } from "$lib/docs-nav.js";

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
  const slug = params.slug;

  if (slug && !isKnownSlug(slug)) {
    error(404, `Documentation page not found: ${slug}`);
  }

  return {
    slug: slug || null,
  };
}
