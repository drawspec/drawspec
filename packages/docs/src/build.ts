import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import MiniSearch from "minisearch";
import { compileDoc } from "./compiler";
import { defineDoc } from "./define-doc";
import { renderDocHtml } from "./renderer-html";
import { discoverDrawSpecPackages, extractPackageApi, generateApiPage } from "./tsdoc-extract";
import type { DiagramNode, DocBlock, DocDocument, DocInline } from "./types";

declare const Bun: {
  Glob: new (
    pattern: string
  ) => {
    scan(options: { cwd: string; absolute?: boolean; onlyFiles?: boolean }): AsyncIterable<string>;
  };
  file(path: string): { text(): Promise<string> };
};

export interface BuildDocsOptions {
  contentDir: string;
  outputDir: string;
  renderDiagram?: (node: DiagramNode) => Promise<string>;
  includeApiDocs?: boolean;
}

export interface BuildDocsPage {
  slug: string;
  title: string;
  description?: string;
  html: string;
  metadata?: Record<string, unknown>;
}

export interface BuildDocsNavigationSection {
  title: string;
  children: Array<{ slug: string; title: string; category?: string }>;
}

export interface BuildDocsManifest {
  pages: BuildDocsPage[];
  navigation?: BuildDocsNavigationSection[];
}

export interface BuildDocsSearchDocument {
  id: string;
  slug: string;
  title: string;
  description: string;
  text: string;
}

export interface BuildDocsSearchIndex {
  version: 1;
  options: {
    fields: string[];
    storeFields: string[];
    searchOptions: {
      boost: Record<string, number>;
      fuzzy: number;
      prefix: boolean;
    };
  };
  index: unknown;
}

const searchIndexOptions = {
  fields: ["title", "description", "text"],
  storeFields: ["slug", "title", "description", "text"],
  searchOptions: {
    boost: { title: 3, description: 2, text: 1 },
    fuzzy: 0.2,
    prefix: true,
  },
} as const;

export async function buildDocs(options: BuildDocsOptions): Promise<BuildDocsManifest> {
  const contentDir = resolve(options.contentDir);
  const outputDir = resolve(options.outputDir);
  const files = await discoverDocFiles(contentDir);
  const pages: BuildDocsPage[] = [];
  const searchDocuments: BuildDocsSearchDocument[] = [];
  await mkdir(outputDir, { recursive: true });
  for (const file of files) {
    const doc = await loadDoc(file);
    resolveCodeBlockSources(doc.content, dirname(file), contentDir);
    const compiled = await compileDoc(doc, {
      baseDir: contentDir,
      readFile: (path) => Bun.file(path).text(),
      validateReferences: true,
    });
    resolveDiagramRefs(compiled.content, dirname(file), contentDir);
    const html = await renderDocHtml(compiled, {
      renderHeader: false,
      ...(options.renderDiagram !== undefined ? { renderDiagram: options.renderDiagram } : {}),
    });
    const page: BuildDocsPage = {
      slug: slugFromPath(contentDir, file),
      title: doc.title,
      ...(doc.description !== undefined ? { description: doc.description } : {}),
      html,
    };
    pages.push(page);
    searchDocuments.push(searchDocumentFromDoc(page, compiled.content));
    await writePage(outputDir, page);
  }

  if (options.includeApiDocs !== false) {
    const apiResult = await buildApiPages({
      contentDir,
      outputDir,
      ...(options.renderDiagram !== undefined ? { renderDiagram: options.renderDiagram } : {}),
    });
    pages.push(...apiResult.pages);
    searchDocuments.push(...apiResult.searchDocuments);
  }

  const sortedPages = pages.sort((left, right) => left.slug.localeCompare(right.slug));
  const navigation = buildNavigation(sortedPages);
  const manifest: BuildDocsManifest = {
    pages: sortedPages,
    ...(navigation.length > 0 ? { navigation } : {}),
  };
  await writeFile(resolve(outputDir, "index.html"), renderIndex(manifest));
  await writeFile(resolve(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(
    resolve(outputDir, "search-index.json"),
    JSON.stringify(buildSearchIndex(searchDocuments))
  );
  return manifest;
}

interface ApiBuildOptions {
  contentDir: string;
  outputDir: string;
  renderDiagram?: (node: DiagramNode) => Promise<string>;
}

interface ApiBuildResult {
  pages: BuildDocsPage[];
  searchDocuments: BuildDocsSearchDocument[];
}

async function buildApiPages(options: ApiBuildOptions): Promise<ApiBuildResult> {
  const workspaceRoot = await findWorkspaceRoot(options.contentDir);
  if (workspaceRoot === undefined) return { pages: [], searchDocuments: [] };

  const packageDirs = await discoverDrawSpecPackages(workspaceRoot);
  const pages: BuildDocsPage[] = [];
  const searchDocuments: BuildDocsSearchDocument[] = [];
  for (const packageDir of packageDirs) {
    const api = await extractPackageApi(packageDir);
    const doc = generateApiPage(api.name, api);
    const compiled = await compileDoc(defineDoc(doc), {
      baseDir: packageDir,
      readFile: (path) => Bun.file(path).text(),
      validateReferences: true,
    });
    const html = await renderDocHtml(compiled, {
      renderHeader: false,
      ...(options.renderDiagram !== undefined ? { renderDiagram: options.renderDiagram } : {}),
    });
    const page: BuildDocsPage = {
      slug: `api/${api.name.replace(/^@drawspec\//, "")}`,
      title: api.name,
      ...(doc.description !== undefined ? { description: doc.description } : {}),
      html,
      metadata: {
        api: true,
        packageName: api.name,
        category: apiCategory(api.name),
        symbolCount: api.symbols.length,
      },
    };
    pages.push(page);
    searchDocuments.push(searchDocumentFromDoc(page, compiled.content));
    await writePage(options.outputDir, page);
  }
  return { pages, searchDocuments };
}

async function discoverDocFiles(contentDir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const file of new Bun.Glob("**/*.doc.ts").scan({
    cwd: contentDir,
    absolute: true,
    onlyFiles: true,
  })) {
    files.push(file);
  }
  return files.sort();
}

async function loadDoc(file: string): Promise<DocDocument> {
  const module = (await import(`${toFileUrl(file)}?t=${Date.now()}`)) as Record<string, unknown>;
  const values = [
    module["default"],
    ...Object.keys(module)
      .filter((key) => key !== "default")
      .sort()
      .map((key) => module[key]),
  ];
  const doc = values.find(isDocDocument);
  if (doc === undefined) throw new Error(`No DocDocument export found in ${file}`);
  return doc;
}

async function writePage(outputDir: string, page: BuildDocsPage): Promise<void> {
  const pagePath = resolve(outputDir, `${page.slug}.html`);
  await mkdir(pagePath.slice(0, pagePath.lastIndexOf(sep)), { recursive: true });
  await writeFile(pagePath, page.html);
}

function slugFromPath(contentDir: string, file: string): string {
  const path = relative(contentDir, file).replaceAll(sep, "/");
  return path.replace(/\.doc\.ts$/, "");
}

function isDocDocument(value: unknown): value is DocDocument {
  const maybe = value as Partial<DocDocument> | undefined;
  return (
    maybe?.schemaVersion !== undefined &&
    typeof maybe.title === "string" &&
    Array.isArray(maybe.content)
  );
}

async function findWorkspaceRoot(startDir: string): Promise<string | undefined> {
  let current = resolve(startDir);
  for (;;) {
    try {
      const packageJson = JSON.parse(await readFile(resolve(current, "package.json"), "utf8")) as {
        workspaces?: unknown;
      };
      const entries = await readdir(current);
      if (Array.isArray(packageJson.workspaces) && entries.includes("packages")) return current;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function resolveCodeBlockSources(
  blocks: import("./types").DocBlock[],
  docDir: string,
  contentDir: string
): void {
  for (const block of blocks) {
    if (
      block.type === "codeBlock" &&
      "source" in block &&
      block.source &&
      !block.source.startsWith("/")
    ) {
      const absolute = resolve(docDir, block.source);
      (block as { source: string }).source = relative(contentDir, absolute).split(sep).join("/");
    }
    const children =
      "children" in block
        ? (block as { children?: import("./types").DocBlock[] }).children
        : undefined;
    if (children) {
      resolveCodeBlockSources(children, docDir, contentDir);
    }
  }
}

function buildNavigation(pages: BuildDocsPage[]): BuildDocsNavigationSection[] {
  const apiPages = pages.filter((page) => page.slug.startsWith("api/"));
  if (apiPages.length === 0) return [];

  const children = apiPages.map((page) => ({
    slug: page.slug,
    title: page.title,
    category: apiCategory(page.title),
  }));
  return [{ title: "API Reference", children }];
}

function apiCategory(packageName: string): string {
  const shortName = packageName.replace(/^@drawspec\//, "");
  if (["core", "docs"].includes(shortName)) return "Core";
  if (
    [
      "uml-sequence",
      "uml-class",
      "uml-state",
      "uml-component",
      "uml-deployment",
      "uml-activity",
      "architecture",
    ].includes(shortName)
  ) {
    return "Diagrams";
  }
  if (["layout", "layout-dagre", "layout-elk", "layout-wasm"].includes(shortName)) return "Layout";
  if (["renderer-svg"].includes(shortName)) return "Rendering";
  if (["exporter-mermaid", "exporter-plantuml", "exporter-d2"].includes(shortName))
    return "Exporters";
  return "Tooling";
}

function searchDocumentFromDoc(page: BuildDocsPage, blocks: DocBlock[]): BuildDocsSearchDocument {
  return {
    id: page.slug,
    slug: page.slug,
    title: page.title,
    description: page.description ?? "",
    text: normalizeSearchText(extractBlockText(blocks)),
  };
}

function buildSearchIndex(documents: BuildDocsSearchDocument[]): BuildDocsSearchIndex {
  const search = new MiniSearch<BuildDocsSearchDocument>({
    fields: [...searchIndexOptions.fields],
    storeFields: [...searchIndexOptions.storeFields],
    searchOptions: searchIndexOptions.searchOptions,
  });
  search.addAll(documents);

  return {
    version: 1,
    options: {
      fields: [...searchIndexOptions.fields],
      storeFields: [...searchIndexOptions.storeFields],
      searchOptions: searchIndexOptions.searchOptions,
    },
    index: search.toJSON(),
  };
}

function extractBlockText(blocks: DocBlock[]): string {
  return blocks.map(extractSingleBlockText).filter(Boolean).join("\n");
}

function extractSingleBlockText(block: DocBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return extractInlineText(block.children);
    case "callout":
      return [block.title, extractInlineText(block.children)].filter(Boolean).join(" ");
    case "linkBlock":
      return [block.label, block.description].filter(Boolean).join(" ");
    case "list":
      return block.children.map((item) => extractBlockText(item.children)).join("\n");
    case "table":
      return block.children
        .map((row) => row.children.map((cell) => extractInlineText(cell.children)).join(" "))
        .join("\n");
    case "image":
      return [block.alt, block.title].filter(Boolean).join(" ");
    case "diagram":
      return block.caption ?? "";
    case "tabGroup":
      return block.children
        .map((tab) => [tab.label, extractBlockText(tab.children)].filter(Boolean).join(" "))
        .join("\n");
    case "badge":
      return block.label;
    case "blockquote":
      return extractBlockText(block.children);
    case "codeBlock":
    case "divider":
    case "thematicBreak":
      return "";
  }
}

function extractInlineText(inlines: DocInline[]): string {
  return inlines.map(extractSingleInlineText).filter(Boolean).join(" ");
}

function extractSingleInlineText(inline: DocInline): string {
  switch (inline.type) {
    case "text":
    case "codeInline":
      return inline.value;
    case "bold":
    case "italic":
    case "link":
      return extractInlineText(inline.children);
  }
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function renderIndex(manifest: BuildDocsManifest): string {
  const links = manifest.pages
    .map(
      (page) => `<li><a href="./${escapeHtml(page.slug)}.html">${escapeHtml(page.title)}</a></li>`
    )
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DrawSpec Docs</title></head><body><main><h1>DrawSpec Docs</h1><ul>${links}</ul></main></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toFileUrl(path: string): string {
  return `file://${path.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function resolveDiagramRefs(
  blocks: import("./types").DocBlock[],
  docDir: string,
  contentDir: string
): void {
  for (const block of blocks) {
    if (block.type === "diagram" && !block.ref.startsWith("/")) {
      const absolute = resolve(docDir, block.ref);
      block.ref = relative(contentDir, absolute).split(sep).join("/");
    }
    const children =
      "children" in block
        ? (block as { children?: import("./types").DocBlock[] }).children
        : undefined;
    if (children) {
      resolveDiagramRefs(children, docDir, contentDir);
    }
  }
}
