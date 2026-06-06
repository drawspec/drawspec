#!/usr/bin/env bun
/**
 * Compare two benchmark result JSON files.
 * Fails if any benchmark regresses beyond the threshold.
 *
 * Usage: bun scripts/bench-compare.ts <baseline.json> <current.json> [--threshold 0.25]
 */

import { parseArgs } from "node:util";

interface BenchFile {
  results: Record<string, number>;
}

interface DiffEntry {
  name: string;
  baseMs: number;
  curMs: number;
  delta: number;
  pct: number;
  status: "REGRESSION" | "improvement" | "ok";
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    threshold: { type: "string", default: "0.25" },
  },
});

const [baselinePath, currentPath] = positionals;
const threshold = parseFloat(values.threshold!);

if (!baselinePath || !currentPath) {
  console.error("Usage: bun scripts/bench-compare.ts <baseline.json> <current.json> [--threshold 0.25]");
  process.exit(2);
}

async function loadResultsAsync(path: string): Promise<Record<string, number>> {
  const raw = (await Bun.file(path).json()) as BenchFile | BenchFile[];
  if ("results" in raw) return raw.results;
  if (Array.isArray(raw)) {
    const merged: Record<string, number> = {};
    for (const entry of raw) Object.assign(merged, entry.results);
    return merged;
  }
  return raw as unknown as Record<string, number>;
}

const baseline = await loadResultsAsync(baselinePath);
const current = await loadResultsAsync(currentPath);

const baselineKeys = new Set(Object.keys(baseline));
const currentKeys = new Set(Object.keys(current));

const common = [...baselineKeys].filter((k) => currentKeys.has(k));
const added = [...currentKeys].filter((k) => !baselineKeys.has(k));
const removed = [...baselineKeys].filter((k) => !currentKeys.has(k));

const regressions: DiffEntry[] = [];
const improvements: DiffEntry[] = [];

for (const name of common) {
  const baseMs = baseline[name];
  const curMs = current[name];
  const delta = curMs - baseMs;
  const pct = (delta / baseMs) * 100;

  if (curMs > baseMs * (1 + threshold)) {
    regressions.push({ name, baseMs, curMs, delta, pct, status: "REGRESSION" });
  } else if (curMs < baseMs * (1 - threshold)) {
    improvements.push({ name, baseMs, curMs, delta, pct, status: "improvement" });
  }
}

const stable: DiffEntry[] = common
  .filter((name) => {
    const baseMs = baseline[name];
    const curMs = current[name];
    return curMs <= baseMs * (1 + threshold) && curMs >= baseMs * (1 - threshold);
  })
  .map((name) => ({
    name,
    baseMs: baseline[name],
    curMs: current[name],
    delta: current[name] - baseline[name],
    pct: ((current[name] - baseline[name]) / baseline[name]) * 100,
    status: "ok" as const,
  }));

const allEntries = [...regressions, ...improvements, ...stable].sort(
  (a, b) => b.pct - a.pct,
);

console.log(`Benchmark comparison (threshold: ±${(threshold * 100).toFixed(0)}%)`);
console.log(`  Baseline: ${baselinePath}`);
console.log(`  Current:  ${currentPath}`);
console.log("");

if (allEntries.length > 0) {
  console.log("Results:");
  for (const entry of allEntries) {
    const sign = entry.delta >= 0 ? "+" : "";
    const marker =
      entry.status === "REGRESSION" ? " ✗" : entry.status === "improvement" ? " ✓" : "";
    console.log(
      `  ${marker} ${entry.name}: ${entry.baseMs.toFixed(2)}ms → ${entry.curMs.toFixed(2)}ms (${sign}${entry.pct.toFixed(1)}%)`,
    );
  }
}

if (added.length > 0) {
  console.log("");
  console.log("New benchmarks:");
  for (const name of added) console.log(`  + ${name}: ${current[name].toFixed(2)}ms`);
}

if (removed.length > 0) {
  console.log("");
  console.log("Removed benchmarks:");
  for (const name of removed) console.log(`  - ${name}: ${baseline[name].toFixed(2)}ms`);
}

console.log("");
console.log(
  `Summary: ${common.length} compared, ${regressions.length} regressions, ${improvements.length} improvements, ${added.length} new, ${removed.length} removed`,
);

if (regressions.length > 0) {
  console.error("");
  console.error(`BENCHMARK REGRESSIONS DETECTED (${regressions.length}):`);
  for (const r of regressions) {
    console.error(
      `  ${r.name}: ${r.baseMs.toFixed(2)}ms → ${r.curMs.toFixed(2)}ms (+${r.pct.toFixed(1)}%)`,
    );
  }
  console.error(`Threshold: +${(threshold * 100).toFixed(0)}%`);
  process.exit(1);
}

console.log("All benchmarks within acceptable range.");
