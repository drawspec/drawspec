import type { DiagramNode } from "@drawspec/docs";
import { buildDocs } from "@drawspec/docs";
import {
  asNumber,
  asString,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_PREVIEW_PORT,
  debounceArg,
  green,
  loadModule,
  red,
  renderDocumentSvgLink,
  waitForShutdown,
  watchFiles,
} from "./shared";
import type { DrawspecCommand } from "./types";

declare const process: { cwd(): string };
declare const Bun: {
  serve(options: {
    hostname?: string;
    port: number;
    fetch(request: Request): Response | Promise<Response>;
  }): { port: number; stop(force?: boolean): void };
  file(path: string): { exists(): Promise<boolean>; text(): Promise<string> };
};

export const serveDocsCommand: DrawspecCommand = {
  name: "serve docs",
  description: "Build and serve documentation with live rebuilds",
  async run(parsed, config) {
    const contentDir = asString(parsed.options["content-dir"]) ?? "docs/content";
    const outputDir = asString(parsed.options["output-dir"]) ?? "docs/dist";
    const host = asString(parsed.options["host"]) ?? "localhost";
    const port = asNumber(parsed.options["port"], DEFAULT_PREVIEW_PORT);
    const debounceMs = asNumber(parsed.options["debounce"], DEFAULT_DEBOUNCE_MS);
    const rebuild = async () =>
      buildDocs({
        contentDir,
        outputDir,
        renderDiagram: (node) => renderDocsDiagram(node, contentDir, config),
      });
    try {
      let manifest = await rebuild();
      const server = Bun.serve({
        hostname: host,
        port,
        async fetch(request) {
          const url = new URL(request.url);
          if (url.pathname === "/manifest.json") return Response.json(manifest);
          const path = url.pathname === "/" ? "/index.html" : url.pathname;
          const file = joinPath(process.cwd(), outputDir, path.slice(1));
          if (await Bun.file(file).exists())
            return new Response(await Bun.file(file).text(), {
              headers: { "content-type": contentType(file) },
            });
          return new Response("Not found", { status: 404 });
        },
      });
      const watcher = watchFiles(
        [contentDir],
        debounceArg(() => {
          void (async () => {
            manifest = await rebuild();
            console.log(
              green(
                `rebuilt docs with ${manifest.pages.length} page${manifest.pages.length === 1 ? "" : "s"}`
              )
            );
          })();
        }, debounceMs)
      );
      console.log(green(`serving DrawSpec docs at http://${host}:${server.port}/`));
      await waitForShutdown(() => {
        watcher.close();
        server.stop(true);
      });
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
  if (loaded?.document === undefined)
    return `<pre>${escapeHtml(loaded?.diagnostics.map((item) => item.message).join("; ") ?? `No diagram found at ${node.ref}`)}</pre>`;
  return await renderDocumentSvgLink(loaded.document, config);
}

function contentType(path: string): string {
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  return "text/html; charset=utf-8";
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
