import {
  type CacheConfig,
  type CacheStore,
  createCacheStore,
  createNoopCacheStore,
  generateCacheKey,
} from "@drawspec/cache";
import { serializeDocument } from "@drawspec/core";
import {
  asString,
  diagnosticsFor,
  hashString,
  loadAll,
  printDiagnostics,
  red,
  renderDocumentSvg,
  safeFileName,
  trimTrailingSlash,
} from "./shared";
import type { DrawspecCommand } from "./types";

declare const Bun: {
  $: (strings: TemplateStringsArray, ...values: unknown[]) => { quiet(): Promise<unknown> };
  write(path: string, content: string): Promise<number>;
};

export const renderCommand: DrawspecCommand = {
  name: "render",
  description: "Render diagrams to SVG",
  async run(parsed, config) {
    const format = asString(parsed.options["format"]) ?? config.render?.defaultFormat ?? "svg";
    if (format !== "svg") {
      console.error(red(`Unsupported render format '${format}'. Only svg is available.`));
      return 1;
    }
    const outDir = asString(parsed.options["out"]) ?? config.outDir ?? "dist";
    await Bun.$`mkdir -p ${outDir}`.quiet();
    const loaded = await loadAll(parsed.files, config);
    const diagnostics = diagnosticsFor(loaded, config);
    printDiagnostics(diagnostics);
    if (diagnostics.some((item) => item.severity === "error")) return 1;
    const themeName = asString(parsed.options["theme"]) ?? config.render?.theme ?? config.theme;
    const cacheDir = asString(parsed.options["cache-dir"]);
    const cache: CacheStore =
      parsed.options["no-cache"] === true
        ? createNoopCacheStore()
        : createCacheStore(cacheDir !== undefined ? { cacheDir } : {});
    const written: string[] = [];
    for (const item of loaded) {
      if (item.document === undefined) continue;
      const cacheConfig: CacheConfig = {
        format,
        packageVersions: { core: "0.0.1", layout: "0.0.1", "renderer-svg": "0.0.1" },
        ...(themeName !== undefined ? { theme: themeName } : {}),
      };
      const cacheKey = generateCacheKey(serializeDocument(item.document), cacheConfig);
      const cached = (await cache.get(cacheKey)) as string | null;
      const svg =
        typeof cached === "string"
          ? cached
          : await renderDocumentSvg(item.document, config, themeName);
      if (typeof cached !== "string") await cache.set(cacheKey, svg);
      const pathHash = hashString(item.file).toString(36).slice(0, 8);
      const outputPath = `${trimTrailingSlash(outDir)}/${safeFileName(item.document.id)}_${pathHash}.svg`;
      await Bun.write(outputPath, svg);
      written.push(outputPath);
    }
    for (const path of written.sort()) console.log(path);
    return 0;
  },
};
