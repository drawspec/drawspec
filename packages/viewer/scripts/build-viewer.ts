import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { compile } from "svelte/compiler";

const packageRoot = join(import.meta.dir, "..");
const componentPath = join(packageRoot, "src/DrawspecDiagram.svelte");
const generatedPath = join(packageRoot, ".generated/DrawspecDiagram.js");
const source = await Bun.file(componentPath).text();
const compiled = compile(source, {
  filename: componentPath,
  generate: "client",
  customElement: true,
  dev: false,
});

await mkdir(dirname(generatedPath), { recursive: true });
await writeFile(
  generatedPath,
  compiled.js.code.replaceAll('from "./render"', 'from "../src/render"')
);

const result = await Bun.build({
  entrypoints: [generatedPath],
  outdir: join(packageRoot, "dist"),
  naming: "drawspec-viewer.js",
  target: "browser",
  format: "esm",
  minify: false,
});

if (!result.success) {
  for (const log of result.logs) console.error(log.message);
  process.exit(1);
}
