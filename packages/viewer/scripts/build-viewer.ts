import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { compile } from "svelte/compiler";

const packageRoot = join(import.meta.dir, "..");
const svelteComponents = [
  { src: "src/DrawspecDiagram.svelte", out: ".generated/DrawspecDiagram.js" },
  { src: "src/explorer/VirtualList.svelte", out: ".generated/explorer/VirtualList.js" },
  { src: "src/explorer/ElementList.svelte", out: ".generated/explorer/ElementList.js" },
];

const rewriteRules: Array<[string, string]> = [
  ['from "./render"', 'from "../src/render"'],
  ['from "./explorer/state"', 'from "../src/explorer/state"'],
  ['from "./explorer/ElementList.svelte"', 'from "./explorer/ElementList.js"'],
  ['from "./explorer/VirtualList.svelte"', 'from "./explorer/VirtualList.js"'],
  ['from "./VirtualList.svelte"', 'from "./VirtualList.js"'],
];

for (const { src, out } of svelteComponents) {
  const componentPath = join(packageRoot, src);
  const generatedPath = join(packageRoot, out);
  const source = await Bun.file(componentPath).text();
  const compiled = compile(source, {
    filename: componentPath,
    generate: "client",
    customElement: true,
    dev: false,
  });

  await mkdir(dirname(generatedPath), { recursive: true });
  let rewritten = compiled.js.code;
  for (const [from, to] of rewriteRules) {
    rewritten = rewritten.replaceAll(from, to);
  }
  await writeFile(generatedPath, rewritten);
}

const result = await Bun.build({
  entrypoints: [join(packageRoot, ".generated/DrawspecDiagram.js")],
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
