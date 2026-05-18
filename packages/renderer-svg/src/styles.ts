import type { DiagramDocument, DiagramEdge, DiagramGroup, DiagramNode } from "@drawspec/core";
import type { ResolvedStyle, SvgTheme } from "./types";

export const defaultTheme: SvgTheme = {
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
  fill?: string | number;
  fontFamily?: string | number;
  fontSize?: string | number;
  stroke?: string | number;
  strokeDasharray?: string | number;
  strokeWidth?: string | number;
  text?: string | number;
}

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

function mergeRule(style: ResolvedStyle, rule: StyleRule | undefined): ResolvedStyle {
  if (rule === undefined) {
    return style;
  }
  const strokeDasharray = asString(rule.strokeDasharray) ?? style.strokeDasharray;
  return {
    ...style,
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
  themeOverrides: Partial<SvgTheme> | undefined,
  elementType: "node" | "edge" | "group" | "activation"
): ResolvedStyle {
  const theme = { ...defaultTheme, ...themeOverrides };
  const base: ResolvedStyle = {
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
