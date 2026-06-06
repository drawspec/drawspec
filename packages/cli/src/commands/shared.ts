import { existsSync, type FSWatcher, watch } from "node:fs";
import type { Workspace } from "@drawspec/architecture";
import { compileWorkspace } from "@drawspec/architecture";
import { DependencyGraph, extractImports } from "@drawspec/cache";
import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import {
  type LayoutEngine,
  type LayoutOptions,
  sequenceLayout,
  simpleGraphLayout,
} from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import {
  loadPolicyPack,
  type RuleConfig,
  recommended,
  recommendedRules,
  validate,
} from "@drawspec/validation";
import type { DrawspecConfig } from "../config";
import { escapeHtml } from "../html";

declare const process: {
  argv: string[];
  platform: "darwin" | "linux" | "win32" | string;
  cwd(): string;
  exit(code?: number): never;
  on(event: "SIGINT" | "SIGTERM", listener: () => void): void;
};
declare const console: {
  log(message?: unknown): void;
  warn(message?: unknown): void;
  error(message?: unknown): void;
};
declare const Bun: {
  argv: string[];
  file(path: string): {
    exists(): Promise<boolean>;
    json(): Promise<unknown>;
    text(): Promise<string>;
  };
  write(path: string, content: string): Promise<number>;
  $: (strings: TemplateStringsArray, ...values: unknown[]) => { quiet(): Promise<unknown> };
  spawn(command: string[], options?: { stdout?: "ignore"; stderr?: "ignore" }): unknown;
  serve(options: ServeOptions): Server;
  Glob: new (
    pattern: string
  ) => {
    scan(options: { cwd: string; absolute?: boolean; onlyFiles?: boolean }): AsyncIterable<string>;
  };
};

interface ServeOptions {
  hostname?: string;
  port: number;
  fetch(request: Request, server: Server): Response | Promise<Response>;
  websocket?: { open?(socket: ServerWebSocket): void; close?(socket: ServerWebSocket): void };
}

export interface Server {
  hostname: string;
  port: number;
  stop(force?: boolean): void;
  upgrade(request: Request): boolean;
}

export interface ServerWebSocket {
  send(message: string): void;
  close(): void;
}

export interface LoadedDocument {
  file: string;
  document?: DiagramDocument;
  diagnostics: Diagnostic[];
}

export interface PreviewDiagram {
  file: string;
  diagramId: string;
  document: DiagramDocument;
  svg: string;
  diagnostics: Diagnostic[];
}

export interface PreviewPayload {
  diagrams: PreviewDiagram[];
  diagnostics: Diagnostic[];
}

type PreviewMessage =
  | { type: "update"; diagramId: string; svg: string }
  | { type: "diagnostics"; items: Diagnostic[] };

export const DEFAULT_PREVIEW_PORT = 4173;
export const DEFAULT_DEBOUNCE_MS = 80;

export const red = (value: string): string => `\u001b[31m${value}\u001b[0m`;
export const yellow = (value: string): string => `\u001b[33m${value}\u001b[0m`;
export const green = (value: string): string => `\u001b[32m${value}\u001b[0m`;

export async function loadConfig(configPath: string | undefined): Promise<DrawspecConfig> {
  const candidates =
    configPath === undefined ? ["drawspec.config.ts", "drawspec.config.json"] : [configPath];
  for (const candidate of candidates) {
    if (!(await Bun.file(candidate).exists())) continue;
    if (candidate.endsWith(".json")) return Bun.file(candidate).json() as Promise<DrawspecConfig>;
    const module = (await import(`${toFileUrl(candidate)}?t=${Date.now()}`)) as {
      default?: unknown;
      config?: unknown;
    };
    const config = module.default ?? module.config;
    return isConfig(config) ? config : {};
  }
  return {};
}

export async function loadAll(
  files: readonly string[],
  config: DrawspecConfig
): Promise<LoadedDocument[]> {
  const discovered = await discoverFiles(
    files.length > 0 ? files : (config.files ?? [process.cwd()])
  );
  if (discovered.length === 0) {
    return [
      {
        file: process.cwd(),
        diagnostics: [diagnostic("drawspec/discovery", "error", "No diagram files found")],
      },
    ];
  }
  const loaded = await Promise.all(discovered.map((file) => loadModule(file)));
  return loaded.flat().sort((left, right) => left.file.localeCompare(right.file));
}

export async function discoverFiles(inputs: readonly string[]): Promise<string[]> {
  const files = new Set<string>();
  const dirsToScan = new Set<string>();
  for (const input of inputs) {
    if (isDiagramFile(input) && (await Bun.file(input).exists())) {
      files.add(input);
      continue;
    }
    if (hasGlobSyntax(input)) {
      await scanGlob(process.cwd(), input, files);
      continue;
    }
    if (existsSync(input)) dirsToScan.add(input);
  }
  if (dirsToScan.size > 0) {
    for (const dir of dirsToScan)
      await scanGlob(dir, `**/{*.diagram.ts,*.arch.ts,*.sequence.ts}`, files);
  }
  return [...files].sort();
}

export async function discoverDocFiles(inputs: readonly string[]): Promise<string[]> {
  const files = new Set<string>();
  for (const input of inputs) {
    if (input.endsWith(".doc.ts") && (await Bun.file(input).exists())) {
      files.add(input);
      continue;
    }
    if (hasGlobSyntax(input)) {
      for await (const file of new Bun.Glob(input).scan({
        cwd: process.cwd(),
        absolute: true,
        onlyFiles: true,
      })) {
        if (file.endsWith(".doc.ts")) files.add(file);
      }
      continue;
    }
    if (existsSync(input)) {
      for await (const file of new Bun.Glob("**/*.doc.ts").scan({
        cwd: input,
        absolute: true,
        onlyFiles: true,
      })) {
        files.add(file);
      }
    }
  }
  return [...files].sort();
}

export async function loadModule(file: string): Promise<LoadedDocument[]> {
  try {
    const module = (await import(`${toFileUrl(file)}?t=${Date.now()}`)) as Record<string, unknown>;
    const values = [
      module["default"],
      ...Object.keys(module)
        .filter((key) => key !== "default")
        .sort()
        .map((key) => module[key]),
    ];
    const documents: DiagramDocument[] = [];
    const errors: string[] = [];
    for (const value of values) {
      const result = compileExport(value);
      if ("error" in result) errors.push(result.error);
      else documents.push(...result);
    }
    if (errors.length > 0 && documents.length === 0) {
      return [
        {
          file,
          diagnostics: [
            diagnostic("drawspec/module", "error", `In '${file}': ${errors.join("; ")}`),
          ],
        },
      ];
    }
    if (documents.length === 0) {
      return [
        {
          file,
          diagnostics: [
            diagnostic(
              "drawspec/module",
              "error",
              `Module at '${file}' did not export a DiagramDocument or Workspace`
            ),
          ],
        },
      ];
    }
    return documents.map((document) => ({
      file,
      document,
      diagnostics: [...(document.diagnostics ?? [])],
    }));
  } catch (error) {
    return [
      {
        file,
        diagnostics: [
          diagnostic(
            "drawspec/import",
            "error",
            `Failed to import ${file}: ${errorMessage(error)}`
          ),
        ],
      },
    ];
  }
}

export function diagnosticsFor(
  loaded: readonly LoadedDocument[],
  config: DrawspecConfig,
  policyName?: string
): Diagnostic[] {
  return loaded.flatMap((item) => [
    ...item.diagnostics,
    ...(item.document === undefined ? [] : validateDocument(item.document, config, policyName)),
  ]);
}

export function validateDocument(
  document: DiagramDocument,
  config: DrawspecConfig,
  policyName?: string
): Diagnostic[] {
  const policyRules = policyName !== undefined ? loadPolicyPack(policyName).rules : {};
  const rules: RuleConfig = {
    ...recommended.rules,
    ...policyRules,
    ...config.validation?.rules,
    ...config.rules,
  };
  return validate({ diagram: document, rules: recommendedRules, config: { rules } }).diagnostics;
}

export async function renderDocumentSvg(
  document: DiagramDocument,
  config: DrawspecConfig,
  themeName?: string
): Promise<string> {
  const renderTheme = themeName ?? config.render?.theme ?? config.theme;
  const engine = await layoutFor(document);
  const positionedDiagram = await engine.layout(document, layoutOptions(document));
  return await renderSvg(document, {
    positionedDiagram,
    accessibility: { title: document.title ?? document.id },
    ...(renderTheme === "dark"
      ? {
          theme: {
            activationFill: "#0c4a6e",
            activationStroke: "#38bdf8",
            background: "#0f172a",
            edgeStroke: "#94a3b8",
            groupFill: "#111827",
            groupStroke: "#475569",
            nodeFill: "#1e293b",
            nodeStroke: "#64748b",
            text: "#f9fafb",
          },
          themeName: "dark",
        }
      : {}),
  });
}

export async function renderDocumentSvgLink(
  document: DiagramDocument,
  config: DrawspecConfig
): Promise<string> {
  const lightSvg = inlineSvg(await renderDocumentSvg(document, config, "light"));
  const darkSvg = namespaceSvgIds(
    inlineSvg(await renderDocumentSvg(document, config, "dark")),
    "dark"
  );
  const fullSizeHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(lightSvg)}`;
  const label = document.title ?? document.id;
  return `<a class="ds-diagram-link" href="${escapeHtml(fullSizeHref)}" target="_blank" rel="noopener noreferrer" aria-label="Open full-size diagram: ${escapeHtml(label)}"><span class="ds-diagram-open-label">Open full-size</span><span class="ds-diagram-svg ds-diagram-svg-light">${lightSvg}</span><span class="ds-diagram-svg ds-diagram-svg-dark">${darkSvg}</span></a>`;
}

function inlineSvg(svg: string): string {
  return svg.replace(/^<\?xml[^>]*>\s*/u, "").trim();
}

function namespaceSvgIds(svg: string, namespace: string): string {
  const suffix = (id: string) => `${id}-${namespace}`;
  return svg
    .replace(/\bid="([^"]+)"/gu, (_match, id: string) => `id="${suffix(id)}"`)
    .replace(
      /\baria-labelledby="([^"]+)"/gu,
      (_match, ids: string) => `aria-labelledby="${ids.split(" ").map(suffix).join(" ")}"`
    )
    .replace(
      /\baria-describedby="([^"]+)"/gu,
      (_match, ids: string) => `aria-describedby="${ids.split(" ").map(suffix).join(" ")}"`
    )
    .replace(/url\(#([^)]+)\)/gu, (_match, id: string) => `url(#${suffix(id)})`);
}

export async function runPreviewServer(options: {
  files: readonly string[];
  config: DrawspecConfig;
  host?: string;
  port: number;
  debounceMs: number;
  noViewer: boolean;
  open: boolean;
}): Promise<number> {
  const sockets = new Set<ServerWebSocket>();
  const allFiles = await discoverFiles(
    options.files.length > 0 ? options.files : (options.config.files ?? [process.cwd()])
  );
  let latest = await compilePreview(options.files, options.config);
  let graph = await buildDependencyGraph(allFiles);
  const server = Bun.serve({
    ...(options.host !== undefined ? { hostname: options.host } : {}),
    port: options.port,
    fetch(request, server) {
      const url = new URL(request.url);
      if (url.pathname === "/ws" && server.upgrade(request))
        return new Response(null, { status: 101 });
      if (options.noViewer) return Response.json(latest);
      if (url.pathname === "/viewer.js") return serveViewerBundle();
      if (url.pathname === "/api/diagrams") return Response.json(latest);
      if (url.pathname === "/" || url.pathname === "/index.html")
        return new Response(previewHtml(latest), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      return new Response("Not found", { status: 404 });
    },
    websocket: {
      open(socket) {
        sockets.add(socket);
        sendSnapshot(socket, latest);
      },
      close(socket) {
        sockets.delete(socket);
      },
    },
  });
  const watcher = watchFiles(
    allFiles,
    debounceArg((changedFile: string) => {
      const affected = graph.getAffected(changedFile);
      void (async () => {
        graph = await buildDependencyGraph(allFiles);
        latest = await compilePreviewIncremental(allFiles, affected, options.config, latest);
        broadcast(sockets, latest);
      })();
    }, options.debounceMs)
  );
  const host = options.host ?? "localhost";
  const url = options.noViewer
    ? `ws://${host}:${server.port}/ws`
    : `http://${host}:${server.port}/`;
  console.log(
    green(
      options.noViewer
        ? `watching ${allFiles.length} file(s) on ${url}`
        : `serving DrawSpec preview at ${url}`
    )
  );
  if (options.open && !options.noViewer) openBrowser(url);
  await waitForShutdown(() => {
    watcher.close();
    for (const socket of sockets) socket.close();
    server.stop(true);
  });
  return 0;
}

export function watchFiles(
  files: readonly string[],
  onChange: (file: string) => void
): { close(): void } {
  const watchers: FSWatcher[] = [];
  for (const file of files) {
    if (existsSync(file)) watchers.push(watch(file, { persistent: true }, () => onChange(file)));
  }
  return {
    close() {
      for (const watcher of watchers) watcher.close();
    },
  };
}

export function debounceArg<T>(callback: (arg: T) => void, delayMs: number): (arg: T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArg: T;
  return (arg: T) => {
    lastArg = arg;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => callback(lastArg), delayMs);
  };
}

export async function waitForShutdown(cleanup: () => void): Promise<void> {
  await new Promise<void>((resolve) => {
    let settled = false;
    const stop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
}

export function printDiagnostics(diagnostics: readonly Diagnostic[]): void {
  for (const item of diagnostics) {
    const label =
      item.severity === "error"
        ? red("error")
        : item.severity === "warning"
          ? yellow("warning")
          : item.severity;
    const source =
      item.source === undefined
        ? ""
        : ` ${item.source.file}:${item.source.line}:${item.source.column}`;
    console.error(`${label} ${item.code}${source} ${item.message}`);
  }
}

export function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asNumber(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function safeFileName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return Math.abs(hash);
}

export function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function toFileUrl(path: string): string {
  const absolute = path.startsWith("/") ? path : `${process.cwd()}/${path}`;
  return `file://${absolute.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}

async function scanGlob(cwd: string, pattern: string, files: Set<string>): Promise<void> {
  for await (const file of new Bun.Glob(pattern).scan({ cwd, absolute: true, onlyFiles: true })) {
    if (isDiagramFile(file)) files.add(file);
  }
}

async function buildDependencyGraph(files: readonly string[]): Promise<DependencyGraph> {
  const graph = new DependencyGraph();
  const absoluteToRelative = new Map<string, string>();
  for (const file of files)
    absoluteToRelative.set(file, file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : ".");
  for (const file of files) {
    try {
      const source = await Bun.file(file).text();
      const deps = extractImports(source)
        .map((imp) =>
          imp.startsWith("./") || imp.startsWith("../")
            ? resolvePath(absoluteToRelative.get(file) ?? ".", imp)
            : imp
        )
        .filter((dep) => files.includes(dep));
      graph.addNode(file, deps);
    } catch (error) {
      if (error instanceof Error) graph.addNode(file, []);
      else graph.addNode(file, []);
    }
  }
  return graph;
}

function resolvePath(baseDir: string, relativePath: string): string {
  const parts = baseDir.split("/");
  const segments = relativePath.split("/");
  if (segments[0] === ".") segments.shift();
  for (const segment of segments) {
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

async function loadAffected(
  allFiles: readonly string[],
  affectedFiles: readonly string[],
  config: DrawspecConfig
): Promise<LoadedDocument[]> {
  if (affectedFiles.length >= allFiles.length) return loadAll(allFiles, config);
  const affectedSet = new Set(affectedFiles);
  const loaded = await Promise.all(
    allFiles.map((file) => (affectedSet.has(file) ? loadModule(file) : null))
  );
  return loaded
    .flat()
    .filter((item): item is LoadedDocument => item !== null)
    .sort((left, right) => left.file.localeCompare(right.file));
}

async function compilePreviewIncremental(
  allFiles: readonly string[],
  affectedFiles: readonly string[],
  config: DrawspecConfig,
  previous: PreviewPayload | null
): Promise<PreviewPayload> {
  const affectedSet = new Set(affectedFiles);
  if (previous === null || affectedFiles.length >= allFiles.length)
    return compilePreview(allFiles, config);
  const loaded = await loadAffected(allFiles, affectedFiles, config);
  const diagnostics = diagnosticsFor(loaded, config);
  const themeName = config.render?.theme ?? config.theme;
  const previousById = new Map(previous.diagrams.map((diagram) => [diagram.diagramId, diagram]));
  const diagrams: PreviewDiagram[] = [];
  for (const item of loaded) {
    if (item.document === undefined) continue;
    const documentDiagnostics = [...item.diagnostics, ...validateDocument(item.document, config)];
    if (documentDiagnostics.some((d) => d.severity === "error")) continue;
    if (!affectedSet.has(item.file)) {
      const cached = previousById.get(item.document.id);
      if (cached !== undefined) {
        diagrams.push(cached);
        continue;
      }
    }
    diagrams.push({
      file: item.file,
      diagramId: item.document.id,
      document: item.document,
      svg: await renderDocumentSvg(item.document, config, themeName),
      diagnostics: documentDiagnostics,
    });
  }
  return { diagrams, diagnostics };
}

function callFactory(value: unknown): { result: unknown } | { error: string } {
  try {
    return { result: (value as () => unknown)() };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function compileExport(value: unknown): DiagramDocument[] | { error: string } {
  if (typeof value === "function") {
    const factoryResult = callFactory(value);
    if ("error" in factoryResult) return { error: factoryResult.error };
    return handleResult(factoryResult.result);
  }
  return handleResult(value);
}

function handleResult(result: unknown): DiagramDocument[] | { error: string } {
  if (result === undefined) return { error: "factory returned undefined" };
  if (Array.isArray(result))
    return result.flatMap((item) => {
      const handled = handleResult(item);
      return "error" in handled ? [] : handled;
    });
  if (isDiagramDocument(result)) return [result];
  if (isWorkspace(result)) return compileWorkspace(result);
  return { error: `exported value is not a DiagramDocument or Workspace (got ${typeof result})` };
}

async function compilePreview(
  files: readonly string[],
  config: DrawspecConfig
): Promise<PreviewPayload> {
  const loaded = await loadAll(files, config);
  const diagnostics = diagnosticsFor(loaded, config);
  const themeName = config.render?.theme ?? config.theme;
  const diagrams: PreviewDiagram[] = [];
  for (const item of loaded) {
    if (item.document === undefined) continue;
    const documentDiagnostics = [...item.diagnostics, ...validateDocument(item.document, config)];
    if (documentDiagnostics.some((item) => item.severity === "error")) continue;
    diagrams.push({
      file: item.file,
      diagramId: item.document.id,
      document: item.document,
      svg: await renderDocumentSvg(item.document, config, themeName),
      diagnostics: documentDiagnostics,
    });
  }
  return { diagrams, diagnostics };
}

function broadcast(sockets: Set<ServerWebSocket>, payload: PreviewPayload): void {
  for (const socket of sockets) sendSnapshot(socket, payload);
}

function sendSnapshot(socket: ServerWebSocket, payload: PreviewPayload): void {
  socket.send(
    JSON.stringify({ type: "diagnostics", items: payload.diagnostics } satisfies PreviewMessage)
  );
  for (const diagram of payload.diagrams)
    socket.send(
      JSON.stringify({
        type: "update",
        diagramId: diagram.diagramId,
        svg: diagram.svg,
      } satisfies PreviewMessage)
    );
}

async function serveViewerBundle(): Promise<Response> {
  const candidates = [
    `${process.cwd()}/packages/viewer/dist/drawspec-viewer.js`,
    `${process.cwd()}/node_modules/@drawspec/viewer/dist/drawspec-viewer.js`,
  ];
  const bundle = candidates.find((path) => existsSync(path));
  if (bundle === undefined)
    return new Response(viewerFallbackScript(), {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  return new Response(await Bun.file(bundle).text(), {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}

function previewHtml(payload: PreviewPayload): string {
  const first = payload.diagrams[0];
  const initialSvg = first === undefined ? "" : JSON.stringify(first.svg);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>DrawSpec Preview</title><script type="module" src="/viewer.js"></script><style>body{margin:0;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a}.shell{display:grid;grid-template-columns:16rem 1fr;min-height:100vh}.sidebar{border-right:1px solid #cbd5e1;padding:1rem;background:#fff}.main{padding:1rem}button{display:block;margin:.25rem 0}</style></head><body><div class="shell"><aside class="sidebar"><h1>DrawSpec</h1><div id="diagram-list">${payload.diagrams.map((diagram) => `<button type="button" data-diagram="${escapeHtml(diagram.diagramId)}">${escapeHtml(diagram.diagramId)}</button>`).join("")}</div></aside><main class="main"><drawspec-diagram id="viewer" interactive theme="light"></drawspec-diagram></main></div><script type="module">const viewer=document.getElementById('viewer');if (${initialSvg}) viewer.svg=${initialSvg};const socketProtocol=location.protocol==='https:'?'wss':'ws';const socket=new WebSocket(socketProtocol+'://'+location.host+'/ws');socket.addEventListener('message',(event)=>{const message=JSON.parse(event.data);if(message.type==='update')viewer.svg=message.svg;if(message.type==='diagnostics')viewer.diagnostics=message.items;});</script></body></html>`;
}

function viewerFallbackScript(): string {
  return `customElements.define('drawspec-diagram', class extends HTMLElement { set svg(value) { this.innerHTML = '<div style="overflow:auto">' + value + '</div>'; } set diagnostics(items) { this.dataset.diagnostics = String(items.length); } });`;
}

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = command === "cmd" ? [command, "/c", "start", "", url] : [command, url];
  Bun.spawn(args, { stdout: "ignore", stderr: "ignore" });
}

async function layoutFor(document: DiagramDocument): Promise<LayoutEngine> {
  const engine = document.layout?.engine;
  if (engine === "sequence" || document.kind === "sequence") {
    return sequenceLayout();
  }
  if (engine === "simple" || engine === undefined) {
    return simpleGraphLayout();
  }
  if (engine === "dagre") {
    return await tryLoadDagreLayout();
  }
  if (engine === "elk") {
    return await tryLoadElkLayout();
  }
  if (engine === "wasm") {
    return await tryLoadWasmLayout();
  }
  console.warn(`Unknown layout engine '${engine}', falling back to simple`);
  return simpleGraphLayout();
}

async function tryLoadDagreLayout(): Promise<LayoutEngine> {
  try {
    const { dagreLayout } = await import("@drawspec/layout-dagre");
    return dagreLayout();
  } catch {
    console.warn(
      "Layout engine 'dagre' requested but @drawspec/layout-dagre is not available, falling back to simple"
    );
    return simpleGraphLayout();
  }
}

async function tryLoadElkLayout(): Promise<LayoutEngine> {
  try {
    const { elkLayout } = await import("@drawspec/layout-elk");
    return elkLayout();
  } catch {
    console.warn(
      "Layout engine 'elk' requested but @drawspec/layout-elk is not available, falling back to simple"
    );
    return simpleGraphLayout();
  }
}

async function tryLoadWasmLayout(): Promise<LayoutEngine> {
  try {
    const { wasmLayout } = await import("@drawspec/layout-wasm");
    return wasmLayout();
  } catch {
    console.warn(
      "Layout engine 'wasm' requested but @drawspec/layout-wasm is not available, falling back to simple"
    );
    return simpleGraphLayout();
  }
}

function layoutOptions(document: DiagramDocument): LayoutOptions {
  const direction = document.layout?.direction?.toUpperCase();
  return direction === "TB" || direction === "BT" || direction === "LR" || direction === "RL"
    ? { direction }
    : {};
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

function isWorkspace(value: unknown): value is Workspace {
  const maybe = value as { model?: unknown; views?: { items?: unknown } } | undefined;
  return maybe?.model !== undefined && Array.isArray(maybe.views?.items);
}

function isConfig(value: unknown): value is DrawspecConfig {
  return typeof value === "object" && value !== null;
}

function diagnostic(code: string, severity: Diagnostic["severity"], message: string): Diagnostic {
  return { code, severity, message };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isDiagramFile(path: string): boolean {
  return /\.(diagram|arch|sequence)\.ts$/.test(path);
}

function hasGlobSyntax(path: string): boolean {
  return /[*?[\]{}]/.test(path);
}
