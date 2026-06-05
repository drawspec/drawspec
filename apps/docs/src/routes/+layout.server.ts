import { getGroupedNavWithSubSections } from "$lib/docs-nav";

export const prerender = true;

export function load() {
  return {
    navGroupsWithSubSections: getGroupedNavWithSubSections(),
  };
}
