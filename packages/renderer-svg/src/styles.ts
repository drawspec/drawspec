import type { DiagramDocument, DiagramEdge, DiagramGroup, DiagramNode } from "@drawspec/core";
import type { ArrowMarkerShape, ResolvedStyle, SvgTheme, SvgThemeInput } from "./types";

export const lightTheme: SvgTheme = {
  activationFill: "#e0f2fe",
  activationStroke: "#0369a1",
  background: "#ffffff",
  edgeStroke: "#475569",
  fontFamily: "Arial, sans-serif",
  fontSize: 14,
  groupFill: "#f8fafc",
  groupStroke: "#94a3b8",
  nodeFill: "#f8fafc",
  nodeStroke: "#334155",
  text: "#0f172a",
};

/** @deprecated Use `lightTheme` instead. Kept for backward compatibility. */
export const defaultTheme: SvgTheme = lightTheme;

export const darkTheme: SvgTheme = {
  activationFill: "#1e3a5f",
  activationStroke: "#38bdf8",
  background: "#0f172a",
  edgeStroke: "#94a3b8",
  fontFamily: "Arial, sans-serif",
  fontSize: 14,
  groupFill: "#1e293b",
  groupStroke: "#475569",
  nodeFill: "#1e293b",
  nodeStroke: "#94a3b8",
  text: "#f8fafc",
};

export const highContrastTheme: SvgTheme = {
  activationFill: "#ffffff",
  activationStroke: "#000000",
  background: "#ffffff",
  edgeStroke: "#000000",
  fontFamily: "Arial, sans-serif",
  fontSize: 14,
  groupFill: "#ffffff",
  groupStroke: "#000000",
  nodeFill: "#ffffff",
  nodeStroke: "#000000",
  text: "#000000",
};

const themePresets: Record<string, SvgTheme> = {
  dark: darkTheme,
  "high-contrast": highContrastTheme,
  light: lightTheme,
};

export function resolveTheme(input: SvgThemeInput | undefined): SvgTheme {
  if (input === undefined || input === "light") {
    return lightTheme;
  }
  if (typeof input === "string") {
    return themePresets[input] ?? lightTheme;
  }
  return { ...lightTheme, ...input };
}

const cssVariableMap: Record<keyof SvgTheme, string> = {
  activationFill: "--ds-activation-fill",
  activationStroke: "--ds-activation-stroke",
  background: "--ds-background",
  edgeStroke: "--ds-edge-stroke",
  fontFamily: "--ds-font-family",
  fontSize: "--ds-font-size",
  groupFill: "--ds-group-fill",
  groupStroke: "--ds-group-stroke",
  nodeFill: "--ds-node-fill",
  nodeStroke: "--ds-node-stroke",
  text: "--ds-text",
};

export function themeToCssVariables(theme: SvgTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, varName] of Object.entries(cssVariableMap)) {
    vars[varName] = String(theme[key as keyof SvgTheme]);
  }
  return vars;
}

export function renderThemeStyleBlock(theme: SvgTheme): string {
  const vars = themeToCssVariables(theme);
  const entries = Object.entries(vars).sort(([a], [b]) => a.localeCompare(b));
  const declarations = entries.map(([prop, value]) => `    ${prop}: ${value};`).join("\n");
  return `  <style>\n    :root {\n${declarations}\n    }\n  </style>`;
}

const kindDefaults: Record<string, Partial<ResolvedStyle>> = {
  actor: { fill: "#eef2ff", stroke: "#4338ca" },
  container: { fill: "#ecfeff", stroke: "#0891b2" },
  database: { fill: "#fef3c7", stroke: "#b45309" },
  person: { fill: "#f0fdf4", stroke: "#15803d" },
  participant: { fill: "#f8fafc", stroke: "#334155" },
  sequence: { fill: "#f8fafc", stroke: "#334155" },
};

type StyledEntity = DiagramNode | DiagramEdge | DiagramGroup;

interface StyleRule {
  arrowEnd?: string | number;
  arrowStart?: string | number;
  fill?: string | number;
  fontFamily?: string | number;
  fontSize?: string | number;
  stroke?: string | number;
  strokeDasharray?: string | number;
  strokeWidth?: string | number;
  text?: string | number;
}

const arrowMarkerShapes = new Set<ArrowMarkerShape>([
  "filled-triangle",
  "open-triangle",
  "open-arrow",
  "diamond",
  "circle",
  "cross",
  "none",
]);

function asString(value: string | number | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

function asNumber(value: string | number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asArrowMarker(value: string | number | undefined): ArrowMarkerShape | undefined {
  const marker = asString(value);
  return marker !== undefined && arrowMarkerShapes.has(marker as ArrowMarkerShape)
    ? (marker as ArrowMarkerShape)
    : undefined;
}

function mergeRule(style: ResolvedStyle, rule: StyleRule | undefined): ResolvedStyle {
  if (rule === undefined) {
    return style;
  }
  const arrowEnd = asArrowMarker(rule.arrowEnd) ?? style.arrowEnd;
  const arrowStart = asArrowMarker(rule.arrowStart) ?? style.arrowStart;
  const strokeDasharray = asString(rule.strokeDasharray) ?? style.strokeDasharray;
  return {
    ...style,
    ...(arrowEnd === undefined ? {} : { arrowEnd }),
    ...(arrowStart === undefined ? {} : { arrowStart }),
    fill: asString(rule.fill) ?? style.fill,
    fontFamily: asString(rule.fontFamily) ?? style.fontFamily,
    fontSize: asNumber(rule.fontSize) ?? style.fontSize,
    stroke: asString(rule.stroke) ?? style.stroke,
    ...(strokeDasharray === undefined ? {} : { strokeDasharray }),
    strokeWidth: asNumber(rule.strokeWidth) ?? style.strokeWidth,
    text: asString(rule.text) ?? style.text,
  };
}

export function resolveStyle(
  document: DiagramDocument,
  entity: StyledEntity,
  themeOverrides: SvgThemeInput | undefined,
  elementType: "node" | "edge" | "group" | "activation"
): ResolvedStyle {
  const theme = resolveTheme(themeOverrides);
  const base: ResolvedStyle = {
    ...(elementType === "edge"
      ? { arrowEnd: "filled-triangle" as const, arrowStart: "filled-triangle" as const }
      : {}),
    fill: elementType === "edge" ? "none" : theme.nodeFill,
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize,
    stroke: elementType === "edge" ? theme.edgeStroke : theme.nodeStroke,
    strokeWidth: 1.5,
    text: theme.text,
  };
  const kindStyle = kindDefaults[entity.kind] ?? {};
  let resolved: ResolvedStyle = { ...base, ...kindStyle };
  if (elementType === "group") {
    resolved = {
      ...resolved,
      fill: theme.groupFill,
      stroke: theme.groupStroke,
      strokeDasharray: "6 4",
    };
  }
  if (elementType === "activation") {
    resolved = { ...resolved, fill: theme.activationFill, stroke: theme.activationStroke };
  }
  const rules = document.styles?.rules ?? {};
  for (const tag of [...(entity.tags ?? [])].sort()) {
    resolved = mergeRule(resolved, tagRule(rules, tag, elementType));
  }
  const explicitRule = entity.style === undefined ? undefined : rules[entity.style.id];
  resolved = mergeRule(resolved, explicitRule);
  return resolved;
}

function tagRule(
  rules: Record<string, Record<string, string | number>>,
  tag: string,
  elementType: "node" | "edge" | "group" | "activation"
): StyleRule | undefined {
  return (
    rules[`tag:${tag}`] ??
    rules[`.${tag}`] ??
    (elementType === "edge" ? rules[`relationship:${tag}`] : undefined) ??
    (elementType === "node" || elementType === "group" ? rules[`element:${tag}`] : undefined)
  );
}
