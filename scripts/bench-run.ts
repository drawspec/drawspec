#!/usr/bin/env bun
/**
 * Run benchmarks and output results as JSON to stdout.
 *
 * Usage: bun scripts/bench-run.ts <bench-file> [--key <name>]
 */

const args = process.argv.slice(2);
const benchFile = args[0];
const keyIndex = args.indexOf("--key");
const key = keyIndex !== -1 ? args[keyIndex + 1] : "current";

if (!benchFile) {
  console.error("Usage: bun scripts/bench-run.ts <bench-file> [--key <name>]");
  process.exit(1);
}

type MsMap = Record<string, number>;

function toMs(value: number, unit: string): number {
  if (unit === "μs") return value / 1000;
  if (unit === "s") return value * 1000;
  return value;
}

function parseBenchmarks(stdout: string): MsMap {
  const results: MsMap = {};
  const ansi = /\x1B\[[0-9;]*[a-zA-Z]/g;
  const lines = stdout.replace(ansi, "").split("\n");

  for (const line of lines) {
    const match1 = line.match(/^\[([\d.]+)(μs|ms|s)\]\s+(.+)$/);
    if (match1) {
      results[match1[3]] = toMs(parseFloat(match1[1]), match1[2]);
      continue;
    }
    const match2 = line.match(/^(.+):\s*([\d.]+)(μs|ms|s)$/);
    if (match2) {
      results[match2[1].trim()] = toMs(parseFloat(match2[2]), match2[3]);
    }
  }
  return results;
}

const proc = Bun.spawn(["bun", "test", "--bench", benchFile], {
  stdout: "pipe",
  stderr: "pipe",
  env: { ...process.env, DRAWSPEC_RUN_BENCH: "1", FORCE_COLOR: "0" },
});

const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();
const exitCode = await proc.exited;

const results = parseBenchmarks(stdout + "\n" + stderr);

if (Object.keys(results).length === 0) {
  console.error("No benchmark results parsed from:", benchFile);
  console.error("stdout:", stdout.slice(-500));
  console.error("stderr:", stderr.slice(-500));
  process.exit(1);
}

console.log(
  JSON.stringify(
    { key, file: benchFile, timestamp: new Date().toISOString(), results },
    null,
    2,
  ),
);
process.exit(exitCode ?? 0);
