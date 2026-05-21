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

async function readUntil(stream: ReadableStream<Uint8Array>, needle: string): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";
  const timeout = Date.now() + 5000;
  while (!output.includes(needle)) {
    if (Date.now() > timeout)
      throw new Error(`Timed out waiting for '${needle}'. Output: ${output}`);
    const result = await reader.read();
    if (result.done) break;
    output += decoder.decode(result.value, { stream: true });
  }
  reader.releaseLock();
  return output;
}

function parsePreviewUrl(output: string): string {
  const sanitized = output.replaceAll("\u001b[32m", "").replaceAll("\u001b[0m", "");
  const match = /http:\/\/\S+/.exec(sanitized);
  if (match === null) throw new Error(`No preview URL in output: ${output}`);
  return match[0];
}

async function withServe<T>(callback: (url: string) => Promise<T>): Promise<T> {
  const proc = Bun.spawn(
    ["bun", cli, "serve", join(fixtures, "payment.sequence.ts"), "--port", "0"],
    {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
    }
  );
  try {
    const output = await readUntil(proc.stdout, "serving DrawSpec preview");
    return await callback(parsePreviewUrl(output));
  } finally {
    proc.kill("SIGTERM");
    await proc.exited;
  }
}

describe("drawspec CLI", () => {
  test("prints help", async () => {
    const result = await runDrawspec(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("drawspec check");
    expect(result.stdout).toContain("drawspec render");
    expect(result.stdout).toContain("drawspec inspect");
    expect(result.stdout).toContain("drawspec build:site");
    expect(result.stdout).toContain("--theme name");
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

  test("serve starts an HTTP preview", async () => {
    await withServe(async (url) => {
      const response = await fetch(url);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain("<drawspec-diagram");
      expect(html).toContain("Payment CLI");
    });
  });

  test("serve accepts WebSocket preview clients", async () => {
    await withServe(async (url) => {
      const wsUrl = `${url.replace("http://", "ws://")}ws`;
      const socket = new WebSocket(wsUrl);
      const message = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timed out waiting for WebSocket message")),
          5000
        );
        socket.addEventListener("message", (event) => {
          clearTimeout(timeout);
          resolve(String(event.data));
        });
        socket.addEventListener("error", () => reject(new Error("WebSocket failed")));
      });
      socket.close();

      expect(JSON.parse(message)).toMatchObject({ type: "diagnostics" });
    });
  });

  test("build-site generates static HTML site", async () => {
    const outDir = await tempDir();
    const result = await runDrawspec([
      "build:site",
      join(fixtures, "payment.sequence.ts"),
      "--out",
      outDir,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("built site");

    const indexHtml = await Bun.file(join(outDir, "index.html")).text();
    expect(indexHtml).toContain("<!doctype html>");
    expect(indexHtml).toContain("DrawSpec Diagrams");
    expect(indexHtml).toContain("Payment CLI");

    const styleCss = await Bun.file(join(outDir, "style.css")).text();
    expect(styleCss).toContain(".card");
    expect(styleCss).toContain(".grid");

    const dir = await Array.fromAsync(new Bun.Glob("*.html").scan({ cwd: outDir }));
    const diagramPages = dir.filter((f) => f !== "index.html");
    expect(diagramPages).toHaveLength(1);

    const diagramPageFile = diagramPages[0];
    expect(diagramPageFile).toBeDefined();
    expect(diagramPageFile).toMatch(/^[a-zA-Z0-9_]+\.html$/);
    const diagramPage = await Bun.file(join(outDir, diagramPageFile as string)).text();
    expect(diagramPage).toContain("<!doctype html>");
    expect(diagramPage).toContain("<svg");
    expect(diagramPage).toContain("Payment CLI");
    expect(diagramPage).toContain("sequence");
  });
});
