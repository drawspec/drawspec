#!/usr/bin/env bun
/**
 * Merge multiple benchmark result JSON files into a single file.
 *
 * Usage: bun scripts/bench-merge.ts --key <name> <result1.json> <result2.json> ... [-o output.json]
 */

import { parseArgs } from "node:util";

interface BenchFile {
  key: string;
  results: Record<string, number>;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    key: { type: "string", default: "current" },
    output: { type: "string", short: "o" },
  },
});

const outputPath: string | undefined = values.output;
const inputPaths = positionals;

if (inputPaths.length === 0) {
  console.error("Usage: bun scripts/bench-merge.ts --key <name> [-o output.json] <result1.json> ...");
  process.exit(2);
}

const merged: Record<string, number> = {};

for (const path of inputPaths) {
  const file = Bun.file(path);
  const raw = (await file.json()) as BenchFile;
  for (const [name, value] of Object.entries(raw.results)) {
    if (name in merged) {
      console.error(`Duplicate benchmark name across files: "${name}"`);
      process.exit(1);
    }
    merged[name] = value;
  }
}

const output: BenchFile = { key: values.key!, results: merged };
const json = JSON.stringify(output, null, 2);

if (outputPath) {
  await Bun.write(outputPath, json);
} else {
  console.log(json);
}
