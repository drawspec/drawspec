import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractPackageApi,
  generateApiPage,
  type TsDocInfo,
  tsDocToDocBlocks,
} from "../tsdoc-extract";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("extractPackageApi", () => {
  test("extracts public exports from a package barrel", async () => {
    const packageDir = await fixturePackage();

    const api = await extractPackageApi(packageDir);

    expect(api.name).toBe("@drawspec/fixture");
    expect(api.groups.function.map((symbol) => symbol.name)).toContain("add");
    expect(api.groups.function.map((symbol) => symbol.name)).toContain("direct");
    expect(api.groups.interface.map((symbol) => symbol.name)).toContain("AddOptions");
    const add = api.symbols.find((symbol) => symbol.name === "add");
    expect(add?.tsdoc.summary).toBe("Adds two numbers.");
    expect(add?.tsdoc.params).toEqual([
      { name: "left", type: "number", description: "First addend." },
      { name: "right", type: "number", description: "Second addend." },
    ]);
    expect(add?.tsdoc.returns).toBe("The sum.");
    expect(add?.tsdoc.examples[0]).toContain("add(1, 2)");
    expect(add?.tsdoc.deprecated).toBe("Use sum instead.");
    expect(add?.tsdoc.see).toEqual(["https://drawspec.dev"]);
  });

  test("keeps exported symbols without TSDoc", async () => {
    const packageDir = await fixturePackage({ withoutComment: true });

    const api = await extractPackageApi(packageDir);
    const constant = api.symbols.find((symbol) => symbol.name === "EMPTY_VALUE");
    const page = generateApiPage(api.name, api);

    expect(constant?.tsdoc.summary).toBe("");
    expect(page.content).toContainEqual({
      type: "heading",
      level: 3,
      id: "empty-value",
      children: [{ type: "text", value: "EMPTY_VALUE" }],
    });
  });

  test("renders declaration-shaped snippets for types and constants", async () => {
    const packageDir = await fixturePackage();

    const api = await extractPackageApi(packageDir);
    const page = generateApiPage(api.name, api);
    const codeBlocks = page.content.filter((block) => block.type === "codeBlock");

    expect(codeBlocks).toContainEqual({
      type: "codeBlock",
      lang: "ts",
      value: "type Result = string",
    });
    expect(codeBlocks).toContainEqual({
      type: "codeBlock",
      lang: "ts",
      value: "const EMPTY_VALUE: number",
    });
  });
});

describe("tsDocToDocBlocks", () => {
  test("converts supported tags to DocBlock IR", () => {
    const tsdoc: TsDocInfo = {
      summary: "Summary text.",
      remarks: ["Detailed remarks."],
      params: [{ name: "value", type: "string", description: "Input value." }],
      returns: "Output value.",
      examples: ["const value = parse();"],
      deprecated: "Use parseValue instead.",
      see: ["https://drawspec.dev/api"],
    };

    const blocks = tsDocToDocBlocks(tsdoc);

    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "paragraph",
      "callout",
      "table",
      "paragraph",
      "codeBlock",
      "paragraph",
    ]);
    const table = blocks.find((block) => block.type === "table");
    expect(table).toBeDefined();
    if (table?.type === "table") expect(table.children).toHaveLength(2);
  });

  test("generates parameter table rows", () => {
    const blocks = tsDocToDocBlocks({
      summary: "",
      remarks: [],
      params: [
        { name: "a", type: "number", description: "First." },
        { name: "b", type: "string", description: "Second." },
      ],
      examples: [],
      see: [],
    });

    const table = blocks[0];
    expect(table?.type).toBe("table");
    if (table?.type === "table") {
      expect(table.children).toHaveLength(3);
      expect(table.children[1]?.children[0]?.children[0]).toEqual({
        type: "codeInline",
        value: "a",
      });
    }
  });
});

describe("generateApiPage", () => {
  test("produces a valid document definition with grouped sections", async () => {
    const packageDir = await fixturePackage();
    const api = await extractPackageApi(packageDir);

    const page = generateApiPage(api.name, api);

    expect(page.title).toBe("@drawspec/fixture");
    expect(page.description).toBe("Fixture package.");
    expect(page.content).toContainEqual({
      type: "heading",
      level: 2,
      id: "functions",
      children: [{ type: "text", value: "Functions" }],
    });
    expect(page.content).toContainEqual({
      type: "heading",
      level: 2,
      id: "interfaces",
      children: [{ type: "text", value: "Interfaces" }],
    });
  });
});

async function fixturePackage(options: { withoutComment?: boolean } = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "drawspec-tsdoc-extract-"));
  tempDirs.push(root);
  const packageDir = join(root, "packages", "fixture");
  await mkdir(join(packageDir, "src"), { recursive: true });
  await writeFile(
    join(packageDir, "package.json"),
    JSON.stringify({ name: "@drawspec/fixture", description: "Fixture package." }, null, 2)
  );
  await writeFile(
    join(packageDir, "src", "index.ts"),
    `export { add, EMPTY_VALUE } from "./math";\nexport type { AddOptions, Result } from "./types";\n/** Direct barrel export. */\nexport function direct(): void {}\n`
  );
  await writeFile(join(packageDir, "src", "math.ts"), mathSource(options.withoutComment));
  await writeFile(
    join(packageDir, "src", "types.ts"),
    `/** Options for addition. */\nexport interface AddOptions {\n  /** Whether to clamp the result. */\n  clamp: boolean;\n}\n/** Addition result. */\nexport type Result = string;\n`
  );
  return packageDir;
}

function mathSource(withoutComment: boolean | undefined): string {
  const constant = withoutComment
    ? "export const EMPTY_VALUE = 0;"
    : "/** Empty numeric value. */\nexport const EMPTY_VALUE = 0;";
  return `
/**
 * Adds two numbers.
 * @remarks
 * This is deterministic.
 * @param left - First addend.
 * @param right - Second addend.
 * @returns The sum.
 * @example
 * const result = add(1, 2);
 * @deprecated Use sum instead.
 * @see https://drawspec.dev
 */
export function add(left: number, right: number): number {
  return left + right;
}

${constant}
`;
}
