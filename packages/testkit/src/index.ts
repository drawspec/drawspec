import {
  compileWorkspace as compileArchitectureWorkspace,
  type Workspace,
} from "@drawspec/architecture";
import { type DiagramDocument, serializeDocument } from "@drawspec/core";
import {
  type LayoutEngine,
  type LayoutOptions,
  sequenceLayout,
  simpleGraphLayout,
} from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import type { ValidationResult } from "@drawspec/validation";

declare const Bun: {
  env: { readonly DRAWSPEC_UPDATE_GOLDEN?: string };
  file(path: string): { exists(): Promise<boolean>; text(): Promise<string> };
  write(path: string, content: string): Promise<number>;
};
declare const process: { cwd(): string };

export type DiagramModule =
  | string
  | DiagramDocument
  | Workspace
  | (() => unknown)
  | readonly unknown[]
  | Record<string, unknown>;

export interface GoldenOptions {
  readonly update?: boolean;
}

interface ModuleNamespace {
  readonly default?: unknown;
  readonly [key: string]: unknown;
}

export async function compileDiagram(module: DiagramModule): Promise<DiagramDocument> {
  const documents = await compileAny(module);
  if (documents.length !== 1) {
    throw new Error(`Expected exactly one diagram, got ${documents.length}.`);
  }
  const [document] = documents;
  if (document === undefined) {
    throw new Error("Expected a diagram document.");
  }
  return document;
}

export async function compileWorkspace(module: DiagramModule): Promise<DiagramDocument[]> {
  const value = await loadModuleValue(module);
  const workspace = selectWorkspace(value);
  if (workspace === undefined) {
    throw new Error("Expected a workspace export.");
  }
  return compileArchitectureWorkspace(workspace);
}

export async function renderFixture(
  document: DiagramDocument,
  layoutOptions: LayoutOptions = {}
): Promise<string> {
  const engine = await selectLayoutEngine(document);
  const positionedDiagram = await engine.layout(
    document,
    normalizedLayoutOptions(document, layoutOptions)
  );
  return renderSvg(document, {
    positionedDiagram,
    accessibility: { title: document.title ?? document.id },
  });
}

async function selectLayoutEngine(document: DiagramDocument): Promise<LayoutEngine> {
  const engine = document.layout?.engine;
  if (engine === "sequence" || document.kind === "sequence") {
    return sequenceLayout();
  }
  if (engine === "simple" || engine === undefined) {
    return simpleGraphLayout();
  }
  if (engine === "dagre") {
    return tryLoadDagreLayout();
  }
  if (engine === "elk") {
    return tryLoadElkLayout();
  }
  if (engine === "wasm") {
    return tryLoadWasmLayout();
  }
  return simpleGraphLayout();
}

async function tryLoadDagreLayout(): Promise<LayoutEngine> {
  try {
    const { dagreLayout } = await import("@drawspec/layout-dagre");
    return dagreLayout();
  } catch {
    return simpleGraphLayout();
  }
}

async function tryLoadElkLayout(): Promise<LayoutEngine> {
  try {
    const { elkLayout } = await import("@drawspec/layout-elk");
    return elkLayout();
  } catch {
    return simpleGraphLayout();
  }
}

async function tryLoadWasmLayout(): Promise<LayoutEngine> {
  try {
    const { wasmLayout } = await import("@drawspec/layout-wasm");
    return wasmLayout();
  } catch {
    return simpleGraphLayout();
  }
}

export function expectDiagram(document: DiagramDocument) {
  const assertions = {
    toHaveNode(idOrLabel: string) {
      assert(
        document.nodes.some((node) => node.id === idOrLabel || node.label === idOrLabel),
        `Expected diagram '${document.id}' to contain node '${idOrLabel}'.`
      );
      return assertions;
    },
    toHaveEdge(label: string) {
      assert(
        document.edges.some((edge) => edge.label === label),
        `Expected diagram '${document.id}' to contain edge '${label}'.`
      );
      return assertions;
    },
    toHaveGroup(label: string) {
      assert(
        document.groups.some((group) => group.label === label || group.id === label),
        `Expected diagram '${document.id}' to contain group '${label}'.`
      );
      return assertions;
    },
  };
  return assertions;
}

export function expectValid(result: ValidationResult): void {
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert(errors.length === 0, `Expected no validation errors, got ${JSON.stringify(errors)}.`);
}

export function expectViolation(result: ValidationResult, ruleCode: string): void {
  assert(
    result.diagnostics.some((diagnostic) => diagnostic.code === ruleCode),
    `Expected validation violation '${ruleCode}', got ${JSON.stringify(result.diagnostics)}.`
  );
}

export function stableIrJson(document: DiagramDocument): string {
  return `${JSON.stringify(JSON.parse(serializeDocument(document)), null, 2)}\n`;
}

export async function expectGolden(
  path: string,
  actual: string,
  options: GoldenOptions = {}
): Promise<void> {
  if (options.update === true || Bun.env.DRAWSPEC_UPDATE_GOLDEN === "1") {
    await Bun.write(path, actual);
    return;
  }
  const file = Bun.file(path);
  assert(await file.exists(), `Golden file '${path}' does not exist.`);
  const expected = await file.text();
  assert(actual === expected, `Golden file '${path}' did not match actual output.`);
}

export async function expectGoldenSvg(
  path: string,
  document: DiagramDocument,
  options: GoldenOptions = {}
): Promise<string> {
  const first = await renderFixture(document);
  const second = await renderFixture(document);
  assert(second === first, `Rendering '${document.id}' was not deterministic.`);
  await expectGolden(path, first, options);
  return first;
}

export async function expectGoldenIr(
  path: string,
  document: DiagramDocument,
  options: GoldenOptions = {}
): Promise<string> {
  const json = stableIrJson(document);
  await expectGolden(path, json, options);
  return json;
}

async function compileAny(module: DiagramModule): Promise<DiagramDocument[]> {
  const value = await loadModuleValue(module);
  const documents = valuesFromModule(value).flatMap((item) => compileValue(item));
  if (documents.length === 0) {
    throw new Error("Module did not export a DiagramDocument or Workspace.");
  }
  return documents;
}

async function loadModuleValue(module: DiagramModule): Promise<unknown> {
  if (typeof module === "string") {
    const suffix = `?t=${Date.now()}`;
    return import(`${toFileUrl(module)}${suffix}`) as Promise<Record<string, unknown>>;
  }
  return module;
}

function valuesFromModule(value: unknown): unknown[] {
  if (!isModuleNamespace(value)) {
    return [value];
  }
  return [
    value.default,
    ...Object.keys(value)
      .filter((key) => key !== "default")
      .sort()
      .map((key) => value[key]),
  ];
}

function compileValue(value: unknown): DiagramDocument[] {
  if (typeof value === "function") {
    return compileValue(value());
  }
  if (Array.isArray(value)) {
    return value.flatMap(compileValue);
  }
  if (isDiagramDocument(value)) {
    return [value];
  }
  if (isWorkspace(value)) {
    return compileArchitectureWorkspace(value);
  }
  return [];
}

function selectWorkspace(value: unknown): Workspace | undefined {
  return valuesFromModule(value)
    .map((item) => (typeof item === "function" ? item() : item))
    .find(isWorkspace);
}

function normalizedLayoutOptions(document: DiagramDocument, options: LayoutOptions): LayoutOptions {
  if (options.direction !== undefined) {
    return options;
  }
  const direction = document.layout?.direction?.toUpperCase();
  return direction === "TB" || direction === "BT" || direction === "LR" || direction === "RL"
    ? { ...options, direction }
    : options;
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
  const maybe = value as Workspace | undefined;
  return maybe?.model !== undefined && Array.isArray(maybe.views?.items);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isModuleNamespace(value: unknown): value is ModuleNamespace {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return "default" in value || Object.prototype.toString.call(value) === "[object Module]";
}

function toFileUrl(path: string): string {
  if (path.startsWith("file://")) {
    return path;
  }
  const absolute = path.startsWith("/") ? path : `${process.cwd()}/${path}`;
  return `file://${absolute.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}
