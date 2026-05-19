import { describe, expect, test } from "bun:test";
import type { HmrContext, ModuleNode, Plugin } from "vite";
import { drawspecVitePlugin, VIRTUAL_PREFIX } from "../index";

function createPlugin(options?: Parameters<typeof drawspecVitePlugin>[0]) {
  return drawspecVitePlugin(options);
}

function callResolveId(plugin: Plugin, source: string): string | null {
  return (plugin.resolveId as (source: string) => string | null)(source);
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

  test("resolveId intercepts diagram files", () => {
    const plugin = createPlugin();

    expect(callResolveId(plugin, "src/app.diagram.ts")).toBe(`${VIRTUAL_PREFIX}src/app.diagram.ts`);
    expect(callResolveId(plugin, "src/system.arch.ts")).toBe(`${VIRTUAL_PREFIX}src/system.arch.ts`);
    expect(callResolveId(plugin, "src/login.sequence.ts")).toBe(
      `${VIRTUAL_PREFIX}src/login.sequence.ts`
    );
  });

  test("resolveId ignores non-diagram files", () => {
    const plugin = createPlugin();

    expect(callResolveId(plugin, "src/utils.ts")).toBeNull();
    expect(callResolveId(plugin, "src/index.ts")).toBeNull();
    expect(callResolveId(plugin, "src/component.tsx")).toBeNull();
  });

  test("resolveId respects include option", () => {
    const plugin = createPlugin({ include: ["diagrams/"] });

    expect(callResolveId(plugin, "diagrams/app.diagram.ts")).toBe(
      `${VIRTUAL_PREFIX}diagrams/app.diagram.ts`
    );
    expect(callResolveId(plugin, "other/app.diagram.ts")).toBeNull();
  });

  test("resolveId respects exclude option", () => {
    const plugin = createPlugin({ exclude: ["node_modules/"] });

    expect(callResolveId(plugin, "node_modules/pkg/app.diagram.ts")).toBeNull();
    expect(callResolveId(plugin, "src/app.diagram.ts")).toBe(`${VIRTUAL_PREFIX}src/app.diagram.ts`);
  });

  test("load returns null for non-virtual ids", async () => {
    const plugin = createPlugin();

    expect(await callLoad(plugin, "src/app.ts")).toBeNull();
    expect(await callLoad(plugin, "something.diagram.ts")).toBeNull();
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
});
