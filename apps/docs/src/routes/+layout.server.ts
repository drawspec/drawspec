import { getGroupedNav } from "$lib/docs-nav";

export const prerender = true;

export function load() {
  return {
    navGroups: getGroupedNav(),
  };
}
