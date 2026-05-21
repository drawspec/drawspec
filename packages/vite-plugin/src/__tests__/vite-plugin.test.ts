import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { HmrContext, ModuleNode, Plugin } from "vite";
import { drawspecVitePlugin, VIRTUAL_PREFIX } from "../index";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const TEST_DIAGRAM = join(FIXTURES_DIR, "test.diagram.ts");
const BAD_DIAGRAM = join(FIXTURES_DIR, "bad.diagram.ts");

function createPlugin(options?: Parameters<typeof drawspecVitePlugin>[0]) {
  return drawspecVitePlugin(options);
}

function callResolveId(
  plugin: Plugin,
  source: string,
  importer?: string,
  resolved?: { id: string } | null
): Promise<string | null> {
  const resolveFn = plugin.resolveId as (
    this: {
      resolve: (
        id: string,
        importer: string | undefined,
        options: { skipSelf: boolean }
      ) => Promise<{ id: string } | null>;
    },
    source: string,
    importer: string | undefined
  ) => Promise<string | null>;
  return resolveFn.call(
    {
      resolve: () => Promise.resolve(resolved === undefined ? { id: source } : resolved),
    },
    source,
    importer
  );
}

async function callLoad(plugin: Plugin, id: string): Promise<string | null> {
  return (plugin.load as (id: string) => Promise<string | null>)(id);
}

function callHandleHotUpdate(plugin: Plugin, ctx: HmrContext): ModuleNode[] | undefined {
  return (plugin.handleHotUpdate as (ctx: HmrContext) => ModuleNode[] | undefined)(ctx);
}

describe("drawspecVitePlugin", () => {
  test("returns a valid Vite plugin shape", () => {
    const plugin = createPlugin();

    expect(plugin.name).toBe("drawspec-vite-plugin");
    expect(typeof plugin.resolveId).toBe("function");
    expect(typeof plugin.load).toBe("function");
    expect(plugin.enforce).toBe("pre");
  });

  test("resolveId intercepts diagram files", async () => {
    const plugin = createPlugin();

    expect(await callResolveId(plugin, "src/app.diagram.ts")).toBe(
      `${VIRTUAL_PREFIX}src/app.diagram.ts`
    );
    expect(await callResolveId(plugin, "src/system.arch.ts")).toBe(
      `${VIRTUAL_PREFIX}src/system.arch.ts`
    );
    expect(await callResolveId(plugin, "src/login.sequence.ts")).toBe(
      `${VIRTUAL_PREFIX}src/login.sequence.ts`
    );
  });

  test("resolveId ignores non-diagram files", async () => {
    const plugin = createPlugin();

    expect(await callResolveId(plugin, "src/utils.ts")).toBeNull();
    expect(await callResolveId(plugin, "src/index.ts")).toBeNull();
    expect(await callResolveId(plugin, "src/component.tsx")).toBeNull();
  });

  test("resolveId respects include option", async () => {
    const plugin = createPlugin({ include: ["diagrams/"] });

    expect(await callResolveId(plugin, "diagrams/app.diagram.ts")).toBe(
      `${VIRTUAL_PREFIX}diagrams/app.diagram.ts`
    );
    expect(await callResolveId(plugin, "other/app.diagram.ts")).toBeNull();
  });

  test("resolveId respects exclude option", async () => {
    const plugin = createPlugin({ exclude: ["node_modules/"] });

    expect(await callResolveId(plugin, "node_modules/pkg/app.diagram.ts")).toBeNull();
    expect(await callResolveId(plugin, "src/app.diagram.ts")).toBe(
      `${VIRTUAL_PREFIX}src/app.diagram.ts`
    );
  });

  test("resolveId uses resolved path from this.resolve", async () => {
    const plugin = createPlugin();
    const resolved = { id: "/absolute/path/app.diagram.ts" };

    const result = await callResolveId(
      plugin,
      "./app.diagram.ts",
      "/absolute/path/index.ts",
      resolved
    );
    expect(result).toBe(`${VIRTUAL_PREFIX}/absolute/path/app.diagram.ts`);
  });

  test("resolveId returns null when this.resolve returns null", async () => {
    const plugin = createPlugin();

    const result = await callResolveId(plugin, "./app.diagram.ts", "/some/importer.ts", null);
    expect(result).toBeNull();
  });

  test("load returns null for non-virtual ids", async () => {
    const plugin = createPlugin();

    expect(await callLoad(plugin, "src/app.ts")).toBeNull();
    expect(await callLoad(plugin, "something.diagram.ts")).toBeNull();
  });

  test("load compiles and serializes a valid diagram file", async () => {
    const plugin = createPlugin();
    const virtualId = `${VIRTUAL_PREFIX}${TEST_DIAGRAM}`;

    const result = await callLoad(plugin, virtualId);
    expect(result).not.toBeNull();
    expect(result?.startsWith("export default ")).toBe(true);
    const parsed = JSON.parse(result?.slice("export default ".length) ?? "{}");
    expect(parsed.id).toBe("test-diagram");
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(Array.isArray(parsed.nodes)).toBe(true);
  });

  test("load throws for an invalid diagram file", async () => {
    const plugin = createPlugin();
    const virtualId = `${VIRTUAL_PREFIX}${BAD_DIAGRAM}`;

    const result = await callLoad(plugin, virtualId);
    expect(result).not.toBeNull();
    expect(result?.startsWith("throw new Error(")).toBe(true);
  });

  test("handleHotUpdate returns undefined for non-diagram files", () => {
    const plugin = createPlugin();
    const ctx = {
      file: "src/utils.ts",
      server: { moduleGraph: { getModuleById: () => undefined } },
    } as unknown as HmrContext;

    expect(callHandleHotUpdate(plugin, ctx)).toBeUndefined();
  });

  test("handleHotUpdate returns module for diagram files", () => {
    const plugin = createPlugin();
    const mockModule = { id: `${VIRTUAL_PREFIX}src/app.diagram.ts` } as ModuleNode;
    const ctx = {
      file: "src/app.diagram.ts",
      server: {
        moduleGraph: {
          getModuleById: () => mockModule,
          invalidateModule: () => {},
        },
      },
    } as unknown as HmrContext;

    const result = callHandleHotUpdate(plugin, ctx);
    expect(result).toEqual([mockModule]);
  });

  test("handleHotUpdate returns undefined when module not found", () => {
    const plugin = createPlugin();
    const ctx = {
      file: "src/app.diagram.ts",
      server: { moduleGraph: { getModuleById: () => undefined } },
    } as unknown as HmrContext;

    expect(callHandleHotUpdate(plugin, ctx)).toBeUndefined();
  });
});
