#!/usr/bin/env bun
import { existsSync, type FSWatcher, watch } from "node:fs";
import type { Workspace } from "@drawspec/architecture";
import { compileWorkspace } from "@drawspec/architecture";
import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import { serializeDocument } from "@drawspec/core";
import { type LayoutOptions, sequenceLayout, simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { type RuleConfig, recommended, recommendedRules, validate } from "@drawspec/validation";
import {
  generateDiagramHtml,
  generateIndexHtml,
  generateStyleCss,
  safeFileName,
  toSiteDiagram,
} from "./build-site";
import type { DrawspecConfig } from "./config";
import { escapeHtml } from "./html";

declare const process: {
  argv: string[];
  platform: "darwin" | "linux" | "win32" | string;
  cwd(): string;
  exit(code?: number): never;
  on(event: "SIGINT" | "SIGTERM", listener: () => void): void;
};
declare const console: { log(message?: unknown): void; error(message?: unknown): void };
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
  websocket?: {
    open?(socket: ServerWebSocket): void;
    close?(socket: ServerWebSocket): void;
    message?(socket: ServerWebSocket, message: string | ArrayBuffer): void;
  };
}

interface Server {
  hostname: string;
  port: number;
  stop(force?: boolean): void;
  upgrade(request: Request): boolean;
}

interface ServerWebSocket {
  send(message: string): void;
  close(): void;
}

type Command = "check" | "render" | "inspect" | "watch" | "serve" | "build:site" | "build-site";

interface ParsedArgs {
  command: Command | undefined;
  files: string[];
  options: Record<string, string | boolean>;
}

interface LoadedDocument {
  file: string;
  document?: DiagramDocument;
  diagnostics: Diagnostic[];
}

interface PreviewDiagram {
  file: string;
  diagramId: string;
  document: DiagramDocument;
  svg: string;
  diagnostics: Diagnostic[];
}

interface PreviewPayload {
  diagrams: PreviewDiagram[];
  diagnostics: Diagnostic[];
}

type PreviewMessage =
  | { type: "update"; diagramId: string; svg: string }
  | { type: "diagnostics"; items: Diagnostic[] };

interface SiteDiagramInternal {
  file: string;
  siteDiagram: import("./build-site").SiteDiagram;
}

const COMMANDS = new Set<string>([
  "check",
  "render",
  "inspect",
  "watch",
  "serve",
  "build:site",
  "build-site",
]);
const DEFAULT_PREVIEW_PORT = 4173;
const DEFAULT_DEBOUNCE_MS = 80;
const red = (value: string) => `\u001b[31m${value}\u001b[0m`;
const yellow = (value: string) => `\u001b[33m${value}\u001b[0m`;
const green = (value: string) => `\u001b[32m${value}\u001b[0m`;

export async function main(argv: readonly string[] = Bun.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.options["help"] === true) {
    printHelp();
    return 0;
  }
  if (parsed.command === undefined) {
    // Check if there's an unknown subcommand (non-option, non-file token)
    const unknownToken = argv.find((arg) => {
      if (arg === undefined || arg.startsWith("--") || arg.startsWith("-")) return false;
      return !COMMANDS.has(arg) && !Bun.file(arg).exists();
    });
    if (unknownToken !== undefined) {
      console.error(red(`Unknown command: '${unknownToken}'`));
      printHelp();
      return 1;
    }
    printHelp();
    return 0;
  }

  const config = await loadConfig(asString(parsed.options["config"]));
  if (parsed.command === "check") {
    return runCheck(parsed, config);
  }
  if (parsed.command === "render") {
    return runRender(parsed, config);
  }
  if (parsed.command === "inspect") {
    return runInspect(parsed, config);
  }
  if (parsed.command === "watch") {
    return runWatch(parsed, config);
  }
  if (parsed.command === "build:site" || parsed.command === "build-site") {
    return runBuildSite(parsed, config);
  }
  return runServe(parsed, config);
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const options: Record<string, string | boolean> = {};
  const files: string[] = [];
  let command: Command | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options["help"] = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[name] = next;
        index += 1;
      } else {
        options[name] = true;
      }
      continue;
    }
    if (command === undefined && COMMANDS.has(arg)) {
      command = arg as Command;
      continue;
    }
    files.push(arg);
  }
  return { command, files, options };
}

function printHelp(): void {
  console.log(`drawspec — TypeScript-native diagrams as code

Usage:
  drawspec check [files...] [--format pretty|json]
  drawspec render [files...] [--out dist] [--format svg] [--theme name]
  drawspec inspect [file] [--format json|pretty]
  drawspec watch [files...] [--port 4173] [--debounce 80]
  drawspec serve [files...] [--host localhost] [--port 4173] [--debounce 80] [--open]
  drawspec build:site [files...] [--out site] [--theme name]

Command aliases: build-site → build:site
Aliases: ds, dspec
Discovery: **/*.diagram.ts, **/*.arch.ts, **/*.sequence.ts`);
}

async function runCheck(parsed: ParsedArgs, config: DrawspecConfig): Promise<number> {
  const loaded = await loadAll(parsed.files, config);
  const diagnostics = diagnosticsFor(loaded, config);
  if (asString(parsed.options["format"]) === "json") {
    console.log(JSON.stringify({ diagnostics }, null, 2));
  } else {
    printDiagnostics(diagnostics);
    console.log(
      diagnostics.some((item) => item.severity === "error")
        ? red("check failed")
        : green("check passed")
    );
  }
  return diagnostics.some((item) => item.severity === "error") ? 1 : 0;
}

async function runRender(parsed: ParsedArgs, config: DrawspecConfig): Promise<number> {
  const format = asString(parsed.options["format"]) ?? config.render?.defaultFormat ?? "svg";
  if (format !== "svg") {
    console.error(red(`Unsupported render format '${format}'. Only svg is available.`));
    return 1;
  }
  const outDir = asString(parsed.options["out"]) ?? config.outDir ?? "dist";
  await Bun.$`mkdir -p ${outDir}`.quiet();
  const loaded = await loadAll(parsed.files, config);
  const diagnostics = diagnosticsFor(loaded, config);
  printDiagnostics(diagnostics);
  if (diagnostics.some((item) => item.severity === "error")) {
    return 1;
  }
  const themeName = asString(parsed.options["theme"]) ?? config.render?.theme ?? config.theme;
  const written: string[] = [];
  for (const item of loaded) {
    if (item.document === undefined) {
      continue;
    }
    const positionedDiagram = await layoutFor(item.document).layout(
      item.document,
      layoutOptions(item.document)
    );
    const renderOptions = {
      positionedDiagram,
      accessibility: { title: item.document.title ?? item.document.id },
      ...(themeName === "dark" ? { theme: { background: "#111827", text: "#f9fafb" } } : {}),
    };
    const svg = await renderSvg(item.document, renderOptions);
    const pathHash = hashString(item.file).toString(36).slice(0, 8);
    const outputPath = `${trimTrailingSlash(outDir)}/${safeFileName(item.document.id)}_${pathHash}.svg`;
    await Bun.write(outputPath, svg);
    written.push(outputPath);
  }
  for (const path of written.sort()) {
    console.log(path);
  }
  return 0;
}

async function runInspect(parsed: ParsedArgs, config: DrawspecConfig): Promise<number> {
  const target = parsed.files[0];
  if (target === undefined) {
    console.error(red("inspect requires a file path"));
    return 1;
  }
  const [loaded] = await loadAll([target], config);
  if (loaded === undefined || loaded.document === undefined) {
    printDiagnostics(
      loaded?.diagnostics ?? [
        diagnostic("drawspec/load", "error", `No document found in ${target}`),
      ]
    );
    return 1;
  }
  const diagnostics = [...loaded.diagnostics, ...validateDocument(loaded.document, config)];
  const payload = { file: loaded.file, document: loaded.document, diagnostics };
  if ((asString(parsed.options["format"]) ?? "json") === "pretty") {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(JSON.stringify(payload));
  }
  return diagnostics.some((item) => item.severity === "error") ? 1 : 0;
}

async function runBuildSite(parsed: ParsedArgs, config: DrawspecConfig): Promise<number> {
  const outDir = asString(parsed.options["out"]) ?? "site";
  await Bun.$`mkdir -p ${outDir}`.quiet();
  const loaded = await loadAll(parsed.files, config);
  const diagnostics = diagnosticsFor(loaded, config);
  printDiagnostics(diagnostics);
  if (diagnostics.some((item) => item.severity === "error")) {
    return 1;
  }
  const themeName = asString(parsed.options["theme"]) ?? config.render?.theme ?? config.theme;
  const siteDiagrams: SiteDiagramInternal[] = [];
  for (const item of loaded) {
    if (item.document === undefined) continue;
    const positionedDiagram = await layoutFor(item.document).layout(
      item.document,
      layoutOptions(item.document)
    );
    const svg = await renderSvg(item.document, {
      positionedDiagram,
      accessibility: { title: item.document.title ?? item.document.id },
      ...(themeName === "dark" ? { theme: { background: "#111827", text: "#f9fafb" } } : {}),
    });
    const pathHash = hashString(item.file).toString(36).slice(0, 8);
    const pageFileName = `${safeFileName(item.document.id)}_${pathHash}.html`;
    siteDiagrams.push({
      file: item.file,
      siteDiagram: toSiteDiagram(item.document, svg, pageFileName),
    });
  }
  const allDiagrams = siteDiagrams.map((d) => d.siteDiagram);
  await Bun.write(`${trimTrailingSlash(outDir)}/style.css`, generateStyleCss());
  await Bun.write(`${trimTrailingSlash(outDir)}/index.html`, generateIndexHtml(allDiagrams));
  for (const { siteDiagram } of siteDiagrams) {
    const pageHtml = generateDiagramHtml(siteDiagram);
    await Bun.write(`${trimTrailingSlash(outDir)}/${siteDiagram.pageFileName}`, pageHtml);
  }
  console.log(
    green(
      `built site with ${allDiagrams.length} diagram${allDiagrams.length === 1 ? "" : "s"} → ${outDir}/`
    )
  );
  return 0;
}

async function runWatch(parsed: ParsedArgs, config: DrawspecConfig): Promise<number> {
  const port = asNumber(parsed.options["port"], DEFAULT_PREVIEW_PORT);
  const debounceMs = asNumber(parsed.options["debounce"], DEFAULT_DEBOUNCE_MS);
  const sockets = new Set<ServerWebSocket>();
  let latest = await compilePreview(parsed.files, config);
  const server = Bun.serve({
    port,
    fetch(request, server) {
      if (new URL(request.url).pathname === "/ws" && server.upgrade(request)) {
        return new Response(null, { status: 101 });
      }
      return Response.json(latest);
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
  const watched = await discoverFiles(
    parsed.files.length > 0 ? parsed.files : (config.files ?? [process.cwd()])
  );
  const watcher = watchFiles(
    watched,
    debounce(() => {
      void compilePreview(parsed.files, config).then((payload) => {
        latest = payload;
        broadcast(sockets, payload);
      });
    }, debounceMs)
  );
  console.log(green(`watching ${watched.length} file(s) on ws://localhost:${server.port}/ws`));
  await waitForShutdown(() => {
    watcher.close();
    for (const socket of sockets) socket.close();
    server.stop(true);
  });
  return 0;
}

async function runServe(parsed: ParsedArgs, config: DrawspecConfig): Promise<number> {
  const host = asString(parsed.options["host"]) ?? "localhost";
  const port = asNumber(parsed.options["port"], DEFAULT_PREVIEW_PORT);
  const debounceMs = asNumber(parsed.options["debounce"], DEFAULT_DEBOUNCE_MS);
  const sockets = new Set<ServerWebSocket>();
  let latest = await compilePreview(parsed.files, config);
  const server = Bun.serve({
    hostname: host,
    port,
    fetch(request, server) {
      const url = new URL(request.url);
      if (url.pathname === "/ws" && server.upgrade(request)) {
        return new Response(null, { status: 101 });
      }
      if (url.pathname === "/viewer.js") {
        return serveViewerBundle();
      }
      if (url.pathname === "/api/diagrams") {
        return Response.json(latest);
      }
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(previewHtml(latest), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
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
  const watched = await discoverFiles(
    parsed.files.length > 0 ? parsed.files : (config.files ?? [process.cwd()])
  );
  const watcher = watchFiles(
    watched,
    debounce(() => {
      void compilePreview(parsed.files, config).then((payload) => {
        latest = payload;
        broadcast(sockets, payload);
      });
    }, debounceMs)
  );
  const url = `http://${host}:${server.port}/`;
  console.log(green(`serving DrawSpec preview at ${url}`));
  if (parsed.options["open"] === true) {
    openBrowser(url);
  }
  await waitForShutdown(() => {
    watcher.close();
    for (const socket of sockets) socket.close();
    server.stop(true);
  });
  return 0;
}

async function loadAll(
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

async function discoverFiles(inputs: readonly string[]): Promise<string[]> {
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
    if (existsSync(input)) {
      dirsToScan.add(input);
    }
  }
  if (dirsToScan.size > 0) {
    const combinedPattern = `**/{*.diagram.ts,*.arch.ts,*.sequence.ts}`;
    for (const dir of dirsToScan) {
      await scanGlob(dir, combinedPattern, files);
    }
  }
  return [...files].sort();
}

async function scanGlob(cwd: string, pattern: string, files: Set<string>): Promise<void> {
  for await (const file of new Bun.Glob(pattern).scan({ cwd, absolute: true, onlyFiles: true })) {
    if (isDiagramFile(file)) {
      files.add(file);
    }
  }
}

async function loadModule(file: string): Promise<LoadedDocument[]> {
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
      if ("error" in result) {
        errors.push(result.error);
      } else {
        documents.push(...result);
      }
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

function callFactory(value: unknown): { result: unknown } | { error: string } {
  try {
    return { result: (value as () => unknown)() };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

function compileExport(value: unknown): DiagramDocument[] | { error: string } {
  if (typeof value === "function") {
    const factoryResult = callFactory(value);
    if ("error" in factoryResult) {
      return { error: factoryResult.error };
    }
    return handleResult(factoryResult.result);
  }
  return handleResult(value);
}

function handleResult(result: unknown): DiagramDocument[] | { error: string } {
  if (result === undefined) {
    return { error: "factory returned undefined" };
  }
  if (Array.isArray(result)) {
    return result.flatMap((item) => {
      const handled = handleResult(item);
      return "error" in handled ? [] : handled;
    });
  }
  if (isDiagramDocument(result)) {
    return [result];
  }
  if (isWorkspace(result)) {
    return compileWorkspace(result);
  }
  return { error: `exported value is not a DiagramDocument or Workspace (got ${typeof result})` };
}

function diagnosticsFor(loaded: readonly LoadedDocument[], config: DrawspecConfig): Diagnostic[] {
  return loaded.flatMap((item) => [
    ...item.diagnostics,
    ...(item.document === undefined ? [] : validateDocument(item.document, config)),
  ]);
}

function validateDocument(document: DiagramDocument, config: DrawspecConfig): Diagnostic[] {
  const rules: RuleConfig = { ...recommended.rules, ...config.validation?.rules, ...config.rules };
  return validate({ diagram: document, rules: recommendedRules, config: { rules } }).diagnostics;
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
    if (item.document === undefined) {
      continue;
    }
    const documentDiagnostics = [...item.diagnostics, ...validateDocument(item.document, config)];
    if (documentDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      continue;
    }
    const positionedDiagram = await layoutFor(item.document).layout(
      item.document,
      layoutOptions(item.document)
    );
    const svg = await renderSvg(item.document, {
      positionedDiagram,
      accessibility: { title: item.document.title ?? item.document.id },
      ...(themeName === "dark" ? { theme: { background: "#111827", text: "#f9fafb" } } : {}),
    });
    diagrams.push({
      file: item.file,
      diagramId: item.document.id,
      document: item.document,
      svg,
      diagnostics: documentDiagnostics,
    });
  }
  return { diagrams, diagnostics };
}

function broadcast(sockets: Set<ServerWebSocket>, payload: PreviewPayload): void {
  for (const socket of sockets) {
    sendSnapshot(socket, payload);
  }
}

function sendSnapshot(socket: ServerWebSocket, payload: PreviewPayload): void {
  socket.send(
    JSON.stringify({ type: "diagnostics", items: payload.diagnostics } satisfies PreviewMessage)
  );
  for (const diagram of payload.diagrams) {
    socket.send(
      JSON.stringify({
        type: "update",
        diagramId: diagram.diagramId,
        svg: diagram.svg,
      } satisfies PreviewMessage)
    );
  }
}

function watchFiles(files: readonly string[], onChange: () => void): { close(): void } {
  const watchers: FSWatcher[] = [];
  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }
    watchers.push(watch(file, { persistent: true }, onChange));
  }
  return {
    close() {
      for (const watcher of watchers) watcher.close();
    },
  };
}

function debounce(callback: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(callback, delayMs);
  };
}

async function waitForShutdown(cleanup: () => void): Promise<void> {
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

async function serveViewerBundle(): Promise<Response> {
  const candidates = [
    `${process.cwd()}/packages/viewer/dist/drawspec-viewer.js`,
    `${process.cwd()}/node_modules/@drawspec/viewer/dist/drawspec-viewer.js`,
  ];
  const bundle = candidates.find((path) => existsSync(path));
  if (bundle === undefined) {
    return new Response(viewerFallbackScript(), {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }
  return new Response(await Bun.file(bundle).text(), {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}

function previewHtml(payload: PreviewPayload): string {
  const first = payload.diagrams[0];
  const initialSvg = first === undefined ? "" : JSON.stringify(first.svg);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DrawSpec Preview</title>
    <script type="module" src="/viewer.js"></script>
    <style>body{margin:0;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a}.shell{display:grid;grid-template-columns:16rem 1fr;min-height:100vh}.sidebar{border-right:1px solid #cbd5e1;padding:1rem;background:#fff}.main{padding:1rem}button{display:block;margin:.25rem 0}</style>
  </head>
  <body>
    <div class="shell">
      <aside class="sidebar">
        <h1>DrawSpec</h1>
        <div id="diagram-list">${payload.diagrams.map((diagram) => `<button type="button" data-diagram="${escapeHtml(diagram.diagramId)}">${escapeHtml(diagram.diagramId)}</button>`).join("")}</div>
      </aside>
      <main class="main">
        <drawspec-diagram id="viewer" interactive theme="light"></drawspec-diagram>
      </main>
    </div>
    <script type="module">
      const viewer = document.getElementById('viewer');
      if (${initialSvg}) viewer.svg = ${initialSvg};
      const socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(socketProtocol + '://' + location.host + '/ws');
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'update') viewer.svg = message.svg;
        if (message.type === 'diagnostics') viewer.diagnostics = message.items;
      });
    </script>
  </body>
</html>`;
}

function viewerFallbackScript(): string {
  return `customElements.define('drawspec-diagram', class extends HTMLElement {
  set svg(value) { this.innerHTML = '<div style="overflow:auto">' + value + '</div>'; }
  set diagnostics(items) { this.dataset.diagnostics = String(items.length); }
});`;
}

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = command === "cmd" ? [command, "/c", "start", "", url] : [command, url];
  Bun.spawn(args, { stdout: "ignore", stderr: "ignore" });
}

function printDiagnostics(diagnostics: readonly Diagnostic[]): void {
  if (diagnostics.length === 0) {
    return;
  }
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

async function loadConfig(configPath: string | undefined): Promise<DrawspecConfig> {
  const candidates =
    configPath === undefined ? ["drawspec.config.ts", "drawspec.config.json"] : [configPath];
  for (const candidate of candidates) {
    if (!(await Bun.file(candidate).exists())) {
      continue;
    }
    if (candidate.endsWith(".json")) {
      return Bun.file(candidate).json() as Promise<DrawspecConfig>;
    }
    const module = (await import(`${toFileUrl(candidate)}?t=${Date.now()}`)) as {
      default?: unknown;
      config?: unknown;
    };
    const config = module.default ?? module.config;
    return isConfig(config) ? config : {};
  }
  return {};
}

function layoutFor(document: DiagramDocument) {
  return document.kind === "sequence" ? sequenceLayout() : simpleGraphLayout();
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

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== "string") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

function toFileUrl(path: string): string {
  const absolute = path.startsWith("/") ? path : `${process.cwd()}/${path}`;
  return `file://${absolute.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

if (import.meta.url === toFileUrl(Bun.argv[1] ?? "")) {
  process.exit(await main());
}

export { serializeDocument };
