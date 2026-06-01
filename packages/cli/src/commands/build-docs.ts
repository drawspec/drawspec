import type { DiagramNode } from "@drawspec/docs";
import { buildDocs } from "@drawspec/docs";
import { asString, green, loadModule, red, renderDocumentSvgLink } from "./shared";
import type { DrawspecCommand } from "./types";

declare const process: { cwd(): string };

export const buildDocsCommand: DrawspecCommand = {
  name: "build docs",
  description: "Build documentation pages from .doc.ts files",
  async run(parsed, config) {
    const contentDir = asString(parsed.options["content-dir"]) ?? "docs/content";
    const outputDir = asString(parsed.options["output-dir"]) ?? "docs/dist";
    try {
      const manifest = await buildDocs({
        contentDir,
        outputDir,
        renderDiagram: (node) => renderDocsDiagram(node, contentDir, config),
      });
      console.log(
        green(
          `built docs with ${manifest.pages.length} page${manifest.pages.length === 1 ? "" : "s"} → ${outputDir}/`
        )
      );
      return 0;
    } catch (error) {
      console.error(red(error instanceof Error ? error.message : String(error)));
      return 1;
    }
  },
};

async function renderDocsDiagram(
  node: DiagramNode,
  contentDir: string,
  config: Parameters<typeof renderDocumentSvgLink>[1]
): Promise<string> {
  const file = node.ref.startsWith("/") ? node.ref : joinPath(process.cwd(), contentDir, node.ref);
  const [loaded] = await loadModule(file);
  if (loaded?.document === undefined) {
    const message =
      loaded?.diagnostics.map((item) => item.message).join("; ") ??
      `No diagram found at ${node.ref}`;
    return `<pre>${escapeHtml(message)}</pre>`;
  }
  return await renderDocumentSvgLink(loaded.document, config);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function joinPath(...parts: string[]): string {
  const [first, ...rest] = parts;
  const prefix = first ?? "";
  return rest.reduce(
    (path, part) => `${path.replace(/\/$/, "")}/${part.replace(/^\//, "")}`,
    prefix
  );
}
