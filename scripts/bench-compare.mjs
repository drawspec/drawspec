#!/usr/bin/env node
/**
 * Benchmark regression checker.
 * Runs benchmarks and compares against baseline, failing if any benchmark
 * is more than 20% slower than baseline.
 */

import { readFileSync } from "node:fs";

const BASELINE_PATH = "benchmarks/baseline.json";
const REGRESSION_THRESHOLD = 0.20; // 20%

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
const capturedBaselineMs = baseline.capturedBaselineMs ?? {};

// Name mapping from benchmark test names to baseline keys
const NAME_MAP = {
  "compile: small 1 diagram / 10 elements": "compileSmall1x10Elements",
  "compile: cold 10 diagrams / 100 elements each": "coldCompile10x100Elements",
  "compile: warm 10 diagrams / 100 elements each": "warmCompile10x100Elements",
  "compile: large 100 diagrams / 100 elements each": "compile100Diagrams100ElementsEach",
  "compile: 1000 tiny diagrams": "compile1000TinyDiagrams",
  "compile: single 1000-element diagram": "compileSingle1000ElementDiagram",
  "compile: 10000 total elements": "compile10000TotalElements",
  "layout: small graph 10 elements": "layoutSmallGraph10Elements",
  "layout: medium graph 100 elements": "layoutMediumGraph100Elements",
  "layout: large graph 1000 elements": "layoutLargeGraph1000Elements",
  "layout: large graph 10000 elements": "layoutLargeGraph10000Elements",
  "layout: large sequence 50 participants / 500 messages": "layoutLargeSequence50x500",
  "render: cold medium graph to SVG": "coldRenderMediumGraph",
  "render: warm medium graph to SVG": "warmRenderMediumGraph",
  "watch: update one medium graph node": "warmPreviewUpdate",
  "cache: filesystem hit": "filesystemCacheHit",
  "cache: filesystem miss": "filesystemCacheMiss",
};

// Strip ANSI escape codes (color, cursor movement, etc.)
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}

function parseBenchmarks(stdout) {
  const results = {};
  const lines = stripAnsi(stdout).split("\n");
  for (const line of lines) {
    // Format 1: [12.3ms] name (Bun test --bench output)
    const match1 = line.match(/^\[([\d.]+)ms\]\s+(.+)$/);
    if (match1) {
      results[match1[2]] = parseFloat(match1[1]);
      continue;
    }
    // Format 2: name: 12.3ms (console.timeEnd output)
    const match2 = line.match(/^(.+):\s*([\d.]+)ms$/);
    if (match2) {
      results[match2[1]] = parseFloat(match2[2]);
    }
  }
  return results;
}

function checkRegressions(results) {
  const regressions = [];
  for (const [testName, timeMs] of Object.entries(results)) {
    const baselineKey = NAME_MAP[testName];
    if (baselineKey && baselineKey in capturedBaselineMs) {
      const baselineTime = capturedBaselineMs[baselineKey];
      const threshold = baselineTime * (1 + REGRESSION_THRESHOLD);
      if (timeMs > threshold) {
        const pct = (((timeMs - baselineTime) / baselineTime) * 100).toFixed(1);
        regressions.push({
          test: testName,
          baseline: baselineTime,
          current: timeMs,
          pct,
        });
      }
    }
  }
  return regressions;
}

// Read benchmark output from stdin
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const results = parseBenchmarks(input);

  if (Object.keys(results).length === 0) {
    console.error("No benchmark results parsed — benchmark output format may have changed.");
    process.exit(1);
  }

  const regressions = checkRegressions(results);

  if (regressions.length > 0) {
    console.error("BENCHMARK REGRESSIONS DETECTED:");
    console.error("");
    for (const r of regressions) {
      console.error(`  ${r.test}`);
      console.error(`    baseline: ${r.baseline}ms, current: ${r.current}ms (+${r.pct}%)`);
    }
    console.error("");
    console.error(`THRESHOLD: ${REGRESSION_THRESHOLD * 100}%`);
    process.exit(1);
  } else {
    console.log("All benchmarks within acceptable range.");
    process.exit(0);
  }
});