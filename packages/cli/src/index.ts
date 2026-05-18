#!/usr/bin/env bun
import type { Workspace } from "@drawspec/architecture";
import { compileWorkspace } from "@drawspec/architecture";
import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import { serializeDocument } from "@drawspec/core";
import { type LayoutOptions, sequenceLayout, simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { type RuleConfig, recommended, recommendedRules, validate } from "@drawspec/validation";
import type { DrawspecConfig } from "./config";

declare const process: { argv: string[]; cwd(): string; exit(code?: number): never };
declare const console: { log(message?: unknown): void; error(message?: unknown): void };
declare global {
  interface ImportMeta {
    readonly url: string;
  }
}
declare const Bun: {
  argv: string[];
  file(path: string): {
    exists(): Promise<boolean>;
    json(): Promise<unknown>;
    text(): Promise<string>;
  };
  write(path: string, content: string): Promise<number>;
  $: (strings: TemplateStringsArray, ...values: unknown[]) => { quiet(): Promise<unknown> };
  Glob: new (
    pattern: string
  ) => {
    scan(options: { cwd: string; absolute?: boolean; onlyFiles?: boolean }): AsyncIterable<string>;
  };
};

type Command = "check" | "render" | "inspect";

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

const DISCOVERY_PATTERNS = ["**/*.diagram.ts", "**/*.arch.ts", "**/*.sequence.ts"] as const;
const COMMANDS = new Set<string>(["check", "render", "inspect"]);
const red = (value: string) => `\u001b[31m${value}\u001b[0m`;
const yellow = (value: string) => `\u001b[33m${value}\u001b[0m`;
const green = (value: string) => `\u001b[32m${value}\u001b[0m`;

export async function main(argv: readonly string[] = Bun.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.options["help"] === true || parsed.command === undefined) {
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
  return runInspect(parsed, config);
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
  if (diagnostics.some((item) => item.severity === "error")) {
    printDiagnostics(diagnostics);
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
    const outputPath = `${trimTrailingSlash(outDir)}/${safeFileName(item.document.id)}.svg`;
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
  for (const input of inputs) {
    if (isDiagramFile(input) && (await Bun.file(input).exists())) {
      files.add(input);
      continue;
    }
    if (hasGlobSyntax(input)) {
      await scanGlob(process.cwd(), input, files);
      continue;
    }
    if (await Bun.file(input).exists()) {
      await Promise.all(DISCOVERY_PATTERNS.map((pattern) => scanGlob(input, pattern, files)));
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
    const documents = values.flatMap((value) => compileExport(value));
    if (documents.length === 0) {
      return [
        {
          file,
          diagnostics: [
            diagnostic(
              "drawspec/module",
              "error",
              "Module did not export a DiagramDocument or Workspace"
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
    return [{ file, diagnostics: [diagnostic("drawspec/import", "error", errorMessage(error))] }];
  }
}

function compileExport(value: unknown): DiagramDocument[] {
  const result = typeof value === "function" ? callFactory(value) : value;
  if (Array.isArray(result)) {
    return result.flatMap((item) => compileExport(item));
  }
  if (isDiagramDocument(result)) {
    return [result];
  }
  if (isWorkspace(result)) {
    return compileWorkspace(result);
  }
  return [];
}

function callFactory(value: unknown): unknown {
  try {
    return (value as () => unknown)();
  } catch {
    return undefined;
  }
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

function safeFileName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

if (import.meta.url === toFileUrl(Bun.argv[1] ?? "")) {
  process.exit(await main());
}

export { serializeDocument };
