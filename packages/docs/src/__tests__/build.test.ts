import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import MiniSearch from "minisearch";
import { buildDocs } from "../build";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("buildDocs", () => {
  test("discovers doc files and derives slugs from relative paths", async () => {
    const root = await tempDir();
    const contentDir = join(root, "content");
    const outputDir = join(root, "dist");
    await writeDoc(join(contentDir, "getting-started.doc.ts"), "Getting Started");
    await writeDoc(join(contentDir, "guides", "sequence-diagrams.doc.ts"), "Sequence Diagrams");

    const manifest = await buildDocs({ contentDir, outputDir });

    expect(manifest.pages.map((page) => page.slug)).toEqual([
      "getting-started",
      "guides/sequence-diagrams",
    ]);
    expect(manifest.pages.map((page) => page.title)).toEqual([
      "Getting Started",
      "Sequence Diagrams",
    ]);
  });

  test("writes page files, manifest, and relative index links", async () => {
    const root = await tempDir();
    const contentDir = join(root, "content");
    const outputDir = join(root, "dist");
    await writeDoc(join(contentDir, "guides", "architecture.doc.ts"), "Architecture");

    const manifest = await buildDocs({ contentDir, outputDir });

    const manifestJson = JSON.parse(await readFile(join(outputDir, "manifest.json"), "utf8")) as {
      pages: Array<{ slug: string; title: string; html: string }>;
    };
    expect(manifestJson).toEqual(manifest);
    const pageHtml = await readFile(join(outputDir, "guides", "architecture.html"), "utf8");
    expect(pageHtml).toContain("Body");
    expect(pageHtml).not.toContain("<h1");
    expect(await readFile(join(outputDir, "index.html"), "utf8")).toContain(
      'href="./guides/architecture.html"'
    );
  });

  test("writes a client-side search index from doc title, description, and body text", async () => {
    const root = await tempDir();
    const contentDir = join(root, "content");
    const outputDir = join(root, "dist");
    await writeDoc(join(contentDir, "guides", "architecture.doc.ts"), "Architecture");

    await buildDocs({ contentDir, outputDir });

    const searchIndex = JSON.parse(
      await readFile(join(outputDir, "search-index.json"), "utf8")
    ) as {
      version: 1;
      options: { fields: string[]; storeFields: string[] };
      index: unknown;
    };
    const search = MiniSearch.loadJSON(JSON.stringify(searchIndex.index), searchIndex.options);

    expect(searchIndex.version).toBe(1);
    expect(search.search("Architecture")[0]?.title).toBe("Architecture");
    expect(search.search("Description")[0]?.slug).toBe("guides/architecture");
    expect(search.search("Body")[0]?.slug).toBe("guides/architecture");
  });

  test("adds API reference pages when a workspace root is present", async () => {
    const root = await tempDir();
    const contentDir = join(root, "docs", "content");
    const outputDir = join(root, "docs", "dist");
    await writeFile(join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    await writeDoc(join(contentDir, "intro.doc.ts"), "Intro");
    await writePackage(join(root, "packages", "fixture"));

    const manifest = await buildDocs({ contentDir, outputDir });

    expect(manifest.pages.map((page) => page.slug)).toContain("api/fixture");
    expect(manifest.navigation).toEqual([
      {
        title: "API Reference",
        children: [{ slug: "api/fixture", title: "@drawspec/fixture", category: "Tooling" }],
      },
    ]);
    expect(await readFile(join(outputDir, "api", "fixture.html"), "utf8")).toContain("greet");
  });

  test("resolves @diagram refs relative to the doc file, not content root", async () => {
    const root = await tempDir();
    const contentDir = join(root, "content");
    const outputDir = join(root, "dist");
    const subDir = join(contentDir, "examples");
    await mkdir(subDir, { recursive: true });

    const docFile = join(subDir, "basic-sequence.doc.ts");
    await writeFile(
      docFile,
      `export default { schemaVersion: "0.1.0", title: "Basic Sequence", content: [{ type: "diagram", ref: "./basic-sequence.sequence.ts", caption: "Example" }] };`
    );

    const diagramFile = join(subDir, "basic-sequence.sequence.ts");
    await writeFile(diagramFile, "export default {};");

    const capturedRefs: string[] = [];
    const manifest = await buildDocs({
      contentDir,
      outputDir,
      renderDiagram: async (node) => {
        capturedRefs.push(node.ref);
        return "<svg>diagram</svg>";
      },
    });

    expect(manifest.pages).toHaveLength(1);
    expect(capturedRefs).toEqual(["examples/basic-sequence.sequence.ts"]);
  });

  test("resolves @diagram refs nested inside list items", async () => {
    const root = await tempDir();
    const contentDir = join(root, "content");
    const outputDir = join(root, "dist");
    const subDir = join(contentDir, "guides");
    await mkdir(subDir, { recursive: true });

    const docFile = join(subDir, "diagrams.doc.ts");
    await writeFile(
      docFile,
      `export default { schemaVersion: "0.1.0", title: "Diagrams", content: [{ type: "list", kind: "unordered", children: [{ checked: undefined, children: [{ type: "diagram", ref: "../shared/demo.sequence.ts" }] }] }] };`
    );

    const sharedDir = join(contentDir, "shared");
    await mkdir(sharedDir, { recursive: true });
    await writeFile(join(sharedDir, "demo.sequence.ts"), "export default {};");

    const capturedRefs: string[] = [];
    await buildDocs({
      contentDir,
      outputDir,
      renderDiagram: async (node) => {
        capturedRefs.push(node.ref);
        return "<svg>diagram</svg>";
      },
    });

    expect(capturedRefs).toEqual(["shared/demo.sequence.ts"]);
  });
});

async function tempDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "drawspec-docs-build-"));
  tempDirs.push(path);
  return path;
}

async function writeDoc(path: string, title: string): Promise<void> {
  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(
    path,
    `export default { schemaVersion: "0.1.0", title: ${JSON.stringify(title)}, description: "Description", content: [{ type: "paragraph", children: [{ type: "text", value: "Body" }] }] };`
  );
}

async function writePackage(packageDir: string): Promise<void> {
  await mkdir(join(packageDir, "src"), { recursive: true });
  await writeFile(
    join(packageDir, "package.json"),
    JSON.stringify({ name: "@drawspec/fixture", description: "Fixture package" })
  );
  await writeFile(join(packageDir, "src", "index.ts"), 'export { greet } from "./greet";\n');
  await writeFile(
    join(packageDir, "src", "greet.ts"),
    `/** Greets a person. */\nexport function greet(name: string): string {\n  return name;\n}\n`
  );
}
