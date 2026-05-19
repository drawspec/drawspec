import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../../../");
const cli = join(repoRoot, "packages/cli/src/index.ts");
const fixtures = join(import.meta.dir, "fixtures");
const tempDirs: string[] = [];

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
  const path = await mkdtemp(join(tmpdir(), "drawspec-export-"));
  tempDirs.push(path);
  return path;
}

describe("drawspec export", () => {
  test("requires --format flag", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--format is required");
  });

  test("requires --out flag", async () => {
    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--format",
      "json",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--out is required");
  });

  test("rejects unknown format", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--format",
      "unknown",
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--format is required");
  });

  test("exports JSON", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--format",
      "json",
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(0);
    const outputPath = result.stdout.trim();
    expect(outputPath).toStartWith(outDir);
    expect(outputPath).toEndWith(".json");
    const content = await Bun.file(outputPath).text();
    const parsed = JSON.parse(content) as { id: string; kind: string; title: string };
    expect(parsed.kind).toBe("sequence");
    expect(parsed.title).toBe("Payment CLI");
  });

  test("exports Mermaid", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--format",
      "mermaid",
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(0);
    const outputPath = result.stdout.trim();
    expect(outputPath).toStartWith(outDir);
    expect(outputPath).toEndWith(".mermaid");
    const content = await Bun.file(outputPath).text();
    expect(content).toContain("sequenceDiagram");
    expect(content).toContain("User");
    expect(content).toContain("API");
  });

  test("exports PlantUML", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--format",
      "plantuml",
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(0);
    const outputPath = result.stdout.trim();
    expect(outputPath).toStartWith(outDir);
    expect(outputPath).toEndWith(".puml");
    const content = await Bun.file(outputPath).text();
    expect(content).toContain("@startuml");
    expect(content).toContain("@enduml");
  });

  test("exports D2", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--format",
      "d2",
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(0);
    const outputPath = result.stdout.trim();
    expect(outputPath).toStartWith(outDir);
    expect(outputPath).toEndWith(".d2");
    const content = await Bun.file(outputPath).text();
    expect(content.length).toBeGreaterThan(0);
  });

  test("creates output directory if it does not exist", async () => {
    const outDir = join(await tempDir(), "nested", "output");
    expect(existsSync(outDir)).toBe(false);

    const result = await runDrawspec([
      "export",
      join(fixtures, "payment.sequence.ts"),
      "--format",
      "json",
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(0);
    expect(existsSync(outDir)).toBe(true);
  });

  test("reports errors when source has validation errors", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "export",
      join(fixtures, "invalid.diagram.ts"),
      "--format",
      "json",
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(1);
  });

  test("shows export in help text", async () => {
    const result = await runDrawspec(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("drawspec export");
    expect(result.stdout).toContain("--format");
    expect(result.stdout).toContain("--out");
  });
});
