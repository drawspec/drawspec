import { getGroupedNav, getGroupedNavWithSubSections } from "$lib/docs-nav";

export const prerender = true;

export function load() {
  return {
    navGroups: getGroupedNav(),
    navGroupsWithSubSections: getGroupedNavWithSubSections(),
  };
}
