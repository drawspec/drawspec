import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface DocPageData {
  slug: string;
  title: string;
  description?: string;
  html: string;
}

export interface DocNavItem {
  slug: string;
  title: string;
  description?: string;
  section?: string;
}

interface DocsManifest {
  pages: DocPageData[];
}

const fallbackHtml = `
<p>The documentation manifest was not found.</p>
<p>Run <code>bunx drawspec build docs --content-dir docs/content --output-dir docs/dist</code> from the repository root, then refresh this page.</p>
`;

const fallbackPage: DocPageData = {
  slug: "__missing-manifest__",
  title: "Documentation manifest missing",
  description: "Build the docs content before viewing the documentation site.",
  html: fallbackHtml,
};

export function getPageData(slug: string): DocPageData | undefined {
  const manifest = readManifest();
  if (manifest === undefined) return fallbackPage;
  return manifest.pages.find((page) => page.slug === slug) ?? sectionPage(manifest, slug);
}

export function getNavItems(): DocNavItem[] {
  const manifest = readManifest();
  if (manifest === undefined) return [];
  return manifest.pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    ...(page.description !== undefined ? { description: page.description } : {}),
    section: sectionFromSlug(page.slug),
  }));
}

function readManifest(): DocsManifest | undefined {
  const manifestPath = getManifestPath();
  if (!existsSync(manifestPath)) return undefined;

  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    return parseManifest(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read docs manifest at ${manifestPath}: ${message}`);
  }
}

function getManifestPath(): string {
  return resolve(process.env.DRAWSPEC_DOCS_MANIFEST ?? "../../docs/dist/manifest.json");
}

function parseManifest(value: unknown): DocsManifest {
  if (!isRecord(value) || !Array.isArray(value["pages"])) {
    throw new Error("Docs manifest must contain a pages array");
  }

  return {
    pages: value["pages"].map(parsePage),
  };
}

function parsePage(value: unknown): DocPageData {
  if (!isRecord(value)) throw new Error("Docs manifest page must be an object");

  const slug = value["slug"];
  const title = value["title"];
  const description = value["description"];
  const html = value["html"];

  if (typeof slug !== "string") throw new Error("Docs manifest page slug must be a string");
  if (typeof title !== "string") throw new Error("Docs manifest page title must be a string");
  if (typeof html !== "string") throw new Error("Docs manifest page html must be a string");
  if (description !== undefined && typeof description !== "string") {
    throw new Error("Docs manifest page description must be a string when present");
  }

  return {
    slug,
    title,
    ...(description !== undefined ? { description } : {}),
    html,
  };
}

function sectionFromSlug(slug: string): string {
  const [section] = slug.split("/");
  return section ?? slug;
}

function sectionPage(manifest: DocsManifest, slug: string): DocPageData | undefined {
  const pages = manifest.pages.filter((page) => sectionFromSlug(page.slug) === slug);
  if (pages.length === 0) return undefined;

  const title = titleCase(slug);
  const links = pages
    .map((page) => {
      const description = page.description
        ? `<p class="ds-paragraph">${escapeHtml(page.description)}</p>`
        : "";
      return `<li><a href="/docs/${escapeHtml(page.slug)}">${escapeHtml(page.title)}</a>${description}</li>`;
    })
    .join("\n");

  return {
    slug,
    title,
    description: `Documentation pages in ${title}.`,
    html: `<ul>${links}</ul>`,
  };
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
