import { exportToD2 } from "@drawspec/exporter-d2";
import { exportToMermaid } from "@drawspec/exporter-mermaid";
import { exportToPlantUML } from "@drawspec/exporter-plantuml";
import {
  asString,
  diagnosticsFor,
  hashString,
  loadAll,
  printDiagnostics,
  red,
  safeFileName,
  trimTrailingSlash,
} from "./shared";
import type { DrawspecCommand } from "./types";

declare const Bun: {
  $: (strings: TemplateStringsArray, ...values: unknown[]) => { quiet(): Promise<unknown> };
  write(path: string, content: string): Promise<number>;
};

const exportFormats = new Set(["mermaid", "plantuml", "d2"]);
const exportExtensions: Record<string, string> = { mermaid: ".mmd", plantuml: ".puml", d2: ".d2" };

export const exportCommand: DrawspecCommand = {
  name: "export",
  description: "Export diagrams to Mermaid, PlantUML, or D2",
  async run(parsed, config) {
    const format = asString(parsed.options["format"]);
    if (format === undefined || !exportFormats.has(format)) {
      console.error(
        red(
          `Unsupported export format '${format ?? ""}'. Must be one of: ${[...exportFormats].join(", ")}`
        )
      );
      return 1;
    }
    const useStdout = parsed.options["stdout"] === true;
    const outDir = asString(parsed.options["out"]) ?? config.outDir ?? "dist";
    if (!useStdout) await Bun.$`mkdir -p ${outDir}`.quiet();
    const loaded = await loadAll(parsed.files, config);
    const diagnostics = diagnosticsFor(loaded, config);
    printDiagnostics(diagnostics);
    if (diagnostics.some((item) => item.severity === "error")) return 1;
    const exporter =
      format === "mermaid"
        ? exportToMermaid
        : format === "plantuml"
          ? exportToPlantUML
          : exportToD2;
    const written: string[] = [];
    for (const item of loaded) {
      if (item.document === undefined) continue;
      const output = exporter(item.document);
      if (useStdout) {
        console.log(output);
        continue;
      }
      const pathHash = hashString(item.file).toString(36).slice(0, 8);
      const outputPath = `${trimTrailingSlash(outDir)}/${safeFileName(item.document.id)}_${pathHash}${exportExtensions[format] ?? `.${format}`}`;
      await Bun.write(outputPath, output);
      written.push(outputPath);
    }
    if (!useStdout) for (const path of written.sort()) console.log(path);
    return 0;
  },
};
