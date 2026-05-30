import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtractedDoc } from "../extractor";
import { createTSDocExtractor } from "../extractor-tsdoc";

async function withTempFile(content: string, ext = ".ts"): Promise<[string, () => Promise<void>]> {
  const dir = join(tmpdir(), `drawspec-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `test${ext}`);
  await writeFile(filePath, content, "utf-8");
  return [
    filePath,
    async () => {
      await rm(dir, { recursive: true, force: true });
    },
  ];
}

async function extract(source: string): Promise<ExtractedDoc[]> {
  const [filePath, cleanup] = await withTempFile(source);
  try {
    const extractor = createTSDocExtractor();
    return await extractor.extract([filePath]);
  } finally {
    await cleanup();
  }
}

describe("createTSDocExtractor", () => {
  test("creates an extractor with correct metadata", () => {
    const extractor = createTSDocExtractor();
    expect(extractor.name).toBe("TSDoc");
    expect(extractor.extensions).toContain(".ts");
    expect(extractor.extensions).toContain(".tsx");
  });
});

describe("TSDoc extractor — simple exported function", () => {
  test("extracts function with description", async () => {
    const source = `
/**
 * Adds two numbers together.
 * @param a First number
 * @param b Second number
 * @returns The sum
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const docs = await extract(source);
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc.name).toBe("add");
    expect(doc.kind).toBe("function");
    expect(doc.description).toBe("Adds two numbers together.");
    expect(doc.exported).toBe(true);
    expect(doc.params).toHaveLength(2);
    expect(doc.params?.[0].name).toBe("a");
    expect(doc.params?.[0].description).toContain("First number");
    expect(doc.returns).toContain("The sum");
  });

  test("extracts @example blocks", async () => {
    const source = `
/**
 * Creates a greeting.
 *
 * @example
 * const g = greet("world");
 * // "Hello, world!"
 */
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
    const docs = await extract(source);
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc.examples).toHaveLength(1);
    expect(doc.examples?.[0]).toContain('greet("world")');
    expect(doc.content.length).toBeGreaterThan(0);
  });
});

describe("TSDoc extractor — class with methods", () => {
  test("extracts class and its exported methods", async () => {
    const source = `
/**
 * A simple calculator.
 */
export class Calculator {
  /**
   * Adds two numbers.
   * @param a First number
   * @param b Second number
   * @returns The sum
   */
  public add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Subtracts b from a.
   * @param a First number
   * @param b Second number
   * @returns The difference
   */
  public subtract(a: number, b: number): number {
    return a - b;
  }
}
`;
    const docs = await extract(source);
    const classDoc = docs.find((d) => d.kind === "class");
    expect(classDoc).toBeDefined();
    expect(classDoc?.name).toBe("Calculator");
    expect(classDoc?.description).toContain("simple calculator");

    const addMethod = docs.find((d) => d.name === "Calculator/add");
    expect(addMethod).toBeDefined();
    expect(addMethod?.kind).toBe("method");
    expect(addMethod?.params).toHaveLength(2);
    expect(addMethod?.returns).toContain("sum");

    const subMethod = docs.find((d) => d.name === "Calculator/subtract");
    expect(subMethod).toBeDefined();
    expect(subMethod?.returns).toContain("difference");
  });
});

describe("TSDoc extractor — interface with properties", () => {
  test("extracts interface and its properties", async () => {
    const source = `
/**
 * Configuration options for the engine.
 */
export interface EngineOptions {
  /** Whether to enable debug mode. */
  debug: boolean;
  /** Maximum number of retries. */
  maxRetries: number;
}
`;
    const docs = await extract(source);
    const iface = docs.find((d) => d.kind === "interface");
    expect(iface).toBeDefined();
    expect(iface?.name).toBe("EngineOptions");
    expect(iface?.description).toContain("Configuration options");

    const debugProp = docs.find((d) => d.name === "EngineOptions/debug");
    expect(debugProp).toBeDefined();
    expect(debugProp?.kind).toBe("property");
    expect(debugProp?.description).toContain("debug mode");

    const retriesProp = docs.find((d) => d.name === "EngineOptions/maxRetries");
    expect(retriesProp).toBeDefined();
    expect(retriesProp?.description).toContain("retries");
  });
});

describe("TSDoc extractor — non-exported symbols", () => {
  test("excludes non-exported functions", async () => {
    const source = `
/**
 * Internal helper.
 */
function helper(): void {}

/**
 * Public API.
 */
export function api(): void {}
`;
    const docs = await extract(source);
    expect(docs).toHaveLength(2);
    const internalDoc = docs.find((d) => d.name === "helper");
    const publicDoc = docs.find((d) => d.name === "api");
    expect(internalDoc).toBeDefined();
    expect(internalDoc?.exported).toBe(false);
    expect(publicDoc).toBeDefined();
    expect(publicDoc?.exported).toBe(true);
  });
});

describe("TSDoc extractor — type aliases and enums", () => {
  test("extracts type aliases", async () => {
    const source = `
/** A string or number identifier. */
export type ID = string | number;
`;
    const docs = await extract(source);
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe("ID");
    expect(docs[0].kind).toBe("type");
    expect(docs[0].description).toContain("string or number");
    expect(docs[0].exported).toBe(true);
  });

  test("extracts enums", async () => {
    const source = `
/** Supported color themes. */
export enum Theme {
  Light = "light",
  Dark = "dark",
}
`;
    const docs = await extract(source);
    const enumDoc = docs.find((d) => d.kind === "enum");
    expect(enumDoc).toBeDefined();
    expect(enumDoc?.name).toBe("Theme");
    expect(enumDoc?.description).toContain("color themes");
  });
});

describe("TSDoc extractor — content blocks", () => {
  test("produces DocBlock[] with heading and paragraphs", async () => {
    const source = `
/**
 * Multi-paragraph description.
 *
 * Second paragraph with more details.
 */
export function documented(): void {}
`;
    const docs = await extract(source);
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc.content[0].type).toBe("heading");
    expect(doc.content.length).toBeGreaterThanOrEqual(3);
    const paragraphs = doc.content.filter((b) => b.type === "paragraph");
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  test("produces params table when @param tags present", async () => {
    const source = `
/**
 * Does a thing.
 * @param x The x value
 * @param y The y value
 */
export function doThing(x: number, y: string): void {}
`;
    const docs = await extract(source);
    const doc = docs[0];
    const table = doc.content.find((b) => b.type === "table");
    expect(table).toBeDefined();
    if (table?.type === "table") {
      expect(table.children.length).toBe(3); // header + 2 data rows
    }
  });

  test("produces code block for @example", async () => {
    const source = `
/**
 * Creates a point.
 * @example
 * const p = createPoint(1, 2);
 */
export function createPoint(x: number, y: number): void {}
`;
    const docs = await extract(source);
    const doc = docs[0];
    const codeBlock = doc.content.find((b) => b.type === "codeBlock");
    expect(codeBlock).toBeDefined();
    if (codeBlock?.type === "codeBlock") {
      expect(codeBlock.lang).toBe("ts");
      expect(codeBlock.value).toContain("createPoint");
    }
  });
});

describe("TSDoc extractor — custom file reader", () => {
  test("uses custom readFile when provided", async () => {
    const extractor = createTSDocExtractor();
    const fakeSource = `
/** A documented function. */
export function custom(): void {}
`;
    const results = await extractor.extract(["/fake/path.ts"], {
      readFile: async () => fakeSource,
    });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("custom");
    expect(results[0].source).toBe("/fake/path.ts");
  });
});

describe("TSDoc extractor — no doc comments", () => {
  test("returns empty array for file without doc comments", async () => {
    const source = `
export function noDocs(): void {
  console.log("no docs here");
}
`;
    const docs = await extract(source);
    expect(docs).toHaveLength(0);
  });
});
