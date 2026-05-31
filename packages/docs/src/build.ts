import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { compileDoc } from "./compiler";
import { renderDocHtml } from "./renderer-html";
import type { DiagramNode, DocDocument } from "./types";

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
}

export interface BuildDocsPage {
  slug: string;
  title: string;
  description?: string;
  html: string;
}

export interface BuildDocsManifest {
  pages: BuildDocsPage[];
}

export async function buildDocs(options: BuildDocsOptions): Promise<BuildDocsManifest> {
  const contentDir = resolve(options.contentDir);
  const outputDir = resolve(options.outputDir);
  const files = await discoverDocFiles(contentDir);
  const pages: BuildDocsPage[] = [];
  await mkdir(outputDir, { recursive: true });
  for (const file of files) {
    const doc = await loadDoc(file);
    const compiled = await compileDoc(doc, {
      baseDir: contentDir,
      readFile: (path) => Bun.file(path).text(),
      validateReferences: true,
    });
    const html = await renderDocHtml(compiled, {
      ...(options.renderDiagram !== undefined ? { renderDiagram: options.renderDiagram } : {}),
    });
    const page: BuildDocsPage = {
      slug: slugFromPath(contentDir, file),
      title: doc.title,
      ...(doc.description !== undefined ? { description: doc.description } : {}),
      html,
    };
    pages.push(page);
    await writePage(outputDir, page);
  }
  const manifest = { pages: pages.sort((left, right) => left.slug.localeCompare(right.slug)) };
  await writeFile(resolve(outputDir, "index.html"), renderIndex(manifest));
  await writeFile(resolve(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
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
