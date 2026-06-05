import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import {
  type LayoutEngine,
  type LayoutOptions,
  sequenceLayout,
  simpleGraphLayout,
} from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import type { ArchitectureData, DrawspecTheme, ViewerPayload } from "./types";

export async function renderDiagramSvg(
  document: DiagramDocument,
  theme: DrawspecTheme = "light"
): Promise<string> {
  const engine = await selectLayoutEngine(document);
  const positionedDiagram = await engine.layout(document, layoutOptions(document));
  return renderSvg(document, {
    positionedDiagram,
    accessibility: { title: document.title ?? document.id },
    ...(theme === "dark" ? { theme: { background: "#111827", text: "#f9fafb" } } : {}),
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

export function normalizeViewerPayload(value: unknown): ViewerPayload {
  if (isDiagramDocument(value)) {
    return { document: value, diagnostics: value.diagnostics ?? [] };
  }
  if (typeof value !== "object" || value === null) {
    return {
      diagnostics: [diagnostic("viewer/payload", "error", "Viewer payload must be an object")],
    };
  }
  const payload = value as Partial<ViewerPayload>;
  return {
    ...(isDiagramDocument(payload.document) ? { document: payload.document } : {}),
    ...(typeof payload.svg === "string" ? { svg: payload.svg } : {}),
    ...(isValidArchitectureData(payload.architecture)
      ? { architecture: payload.architecture }
      : {}),
    diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics : [],
  };
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
    Array.isArray(maybe.edges) &&
    Array.isArray(maybe.groups) &&
    Array.isArray(maybe.annotations)
  );
}

function isValidArchitectureData(value: unknown): value is ArchitectureData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<ArchitectureData>;
  return Array.isArray(data.elements) && Array.isArray(data.relationships);
}

function diagnostic(code: string, severity: Diagnostic["severity"], message: string): Diagnostic {
  return { code, severity, message };
}
