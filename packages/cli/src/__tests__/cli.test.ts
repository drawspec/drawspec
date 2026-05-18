import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../../../");
const cli = join(repoRoot, "packages/cli/src/index.ts");
const fixtures = join(import.meta.dir, "fixtures");
const tempDirs: string[] = [];

describe("package.json", () => {
  test("bin field contains expected aliases", async () => {
    const pkg = await import(join(repoRoot, "packages/cli/package.json"));
    expect(pkg.bin).toEqual({
      drawspec: "./dist/index.js",
      ds: "./dist/index.js",
      dspec: "./dist/index.js",
    });
  });
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function runDrawspec(args: string[]) {
  const proc = Bun.spawn(["bun", cli, ...args], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

async function tempDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "drawspec-cli-"));
  tempDirs.push(path);
  return path;
}

describe("drawspec CLI", () => {
  test("prints help", async () => {
    const result = await runDrawspec(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("drawspec check");
    expect(result.stdout).toContain("drawspec render");
    expect(result.stdout).toContain("drawspec inspect");
  });

  test("checks fixture files", async () => {
    const result = await runDrawspec(["check", join(fixtures, "payment.sequence.ts")]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("check passed");
  });

  test("returns diagnostics as JSON", async () => {
    const result = await runDrawspec([
      "check",
      join(fixtures, "invalid.diagram.ts"),
      "--format",
      "json",
    ]);

    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout) as { diagnostics: Array<{ code: string }> };
    expect(payload.diagnostics.map((item) => item.code)).toContain("diagram/no-duplicate-node-id");
  });

  test("renders SVG files", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "render",
      join(fixtures, "payment.sequence.ts"),
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(0);
    const outputPath = result.stdout.trim();
    expect(outputPath).toStartWith(outDir);
    expect(outputPath).toEndWith(".svg");
    const svg = await Bun.file(outputPath).text();
    expect(svg).toContain("<svg");
    expect(svg).toContain("Payment CLI");
  });

  test("inspects IR as JSON", async () => {
    const result = await runDrawspec(["inspect", join(fixtures, "payment.sequence.ts")]);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as { document: { kind: string; nodes: unknown[] } };
    expect(payload.document.kind).toBe("sequence");
    expect(payload.document.nodes).toHaveLength(2);
  });
});
