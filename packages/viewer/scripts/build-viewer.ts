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
const rewritten = compiled.js.code
  .replaceAll('from "./render"', 'from "../src/render"')
  .replaceAll('from "./explorer/state"', 'from "../src/explorer/state"');
await writeFile(generatedPath, rewritten);

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
