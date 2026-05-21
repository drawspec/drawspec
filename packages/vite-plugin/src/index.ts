import type { DiagramDocument } from "@drawspec/core";
import { serializeDocument } from "@drawspec/core";
import type { HmrContext, ModuleNode, Plugin } from "vite";

export interface DrawspecVitePluginOptions {
  include?: string[];
  exclude?: string[];
}

const DIAGRAM_EXTENSIONS = /\.(diagram|arch|sequence)\.ts$/;
const VIRTUAL_PREFIX = "\0drawspec:";

function isDiagramFile(id: string): boolean {
  return DIAGRAM_EXTENSIONS.test(id);
}

function matchesPattern(
  id: string,
  include: readonly string[] | undefined,
  exclude: readonly string[] | undefined
): boolean {
  if (exclude !== undefined && exclude.length > 0) {
    for (const pattern of exclude) {
      if (id.includes(pattern)) return false;
    }
  }
  if (include !== undefined && include.length > 0) {
    for (const pattern of include) {
      if (id.includes(pattern)) return true;
    }
    return false;
  }
  return true;
}

function isDiagramDocument(value: unknown): value is DiagramDocument {
  const maybe = value as Partial<DiagramDocument> | undefined;
  return (
    maybe?.schemaVersion !== undefined &&
    typeof maybe.id === "string" &&
    Array.isArray(maybe.nodes) &&
    Array.isArray(maybe.edges)
  );
}

function toFileUrl(path: string): string {
  if (path.startsWith("file://")) {
    return path;
  }
  const absolute = path.startsWith("/") ? path : `${process.cwd()}/${path}`;
  return `file://${absolute.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}

async function compileDiagramFile(filePath: string): Promise<DiagramDocument> {
  const module = (await import(`${toFileUrl(filePath)}?t=${Date.now()}`)) as Record<
    string,
    unknown
  >;
  const candidates = [
    module["default"],
    ...Object.keys(module)
      .filter((key) => key !== "default")
      .sort()
      .map((key) => module[key]),
  ];
  for (const candidate of candidates) {
    const value = typeof candidate === "function" ? (candidate as () => unknown)() : candidate;
    if (isDiagramDocument(value)) {
      return value;
    }
  }
  throw new Error(`Module at '${filePath}' did not export a DiagramDocument`);
}

interface ResolveContext {
  resolve: (
    id: string,
    importer: string | undefined,
    options: { skipSelf: boolean }
  ) => Promise<{ id: string } | null>;
}

export function drawspecVitePlugin(options?: DrawspecVitePluginOptions): Plugin {
  const include = options?.include;
  const exclude = options?.exclude;

  return {
    name: "drawspec-vite-plugin",
    enforce: "pre" as const,

    async resolveId(
      this: ResolveContext,
      source: string,
      importer: string | undefined
    ): Promise<string | null> {
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (
        resolved !== null &&
        isDiagramFile(resolved.id) &&
        matchesPattern(resolved.id, include, exclude)
      ) {
        return `${VIRTUAL_PREFIX}${resolved.id}`;
      }
      return null;
    },

    async load(id: string): Promise<string | null> {
      if (!id.startsWith(VIRTUAL_PREFIX)) {
        return null;
      }
      const filePath = id.slice(VIRTUAL_PREFIX.length);
      try {
        const document = await compileDiagramFile(filePath);
        const json = serializeDocument(document);
        return `export default ${json}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `throw new Error(${JSON.stringify(message)})`;
      }
    },

    handleHotUpdate(ctx: HmrContext): Array<ModuleNode> | undefined {
      if (!isDiagramFile(ctx.file) || !matchesPattern(ctx.file, include, exclude)) {
        return undefined;
      }
      const virtualId = `${VIRTUAL_PREFIX}${ctx.file}`;
      const mod = ctx.server.moduleGraph.getModuleById(virtualId);
      if (mod !== undefined) {
        ctx.server.moduleGraph.invalidateModule(mod);
        return [mod];
      }
      return undefined;
    },
  };
}

export { VIRTUAL_PREFIX };
