export type AttributeValue = string | number | boolean | undefined;

export interface SvgElementSpec {
  name: string;
  attrs?: Record<string, AttributeValue>;
  children?: Array<SvgElementSpec | string>;
  selfClosing?: boolean;
}

export function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;");
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot render non-finite SVG number: ${value}`);
  }
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function stableSvgId(prefix: string, ...parts: string[]): string {
  const raw = [prefix, ...parts].join("-");
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return `${slug}-${stableHash(raw)}`;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

export function compareStable(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function renderAttributeValue(value: AttributeValue): string | undefined {
  if (value === undefined || value === false) {
    return undefined;
  }
  if (typeof value === "number") {
    return formatNumber(value);
  }
  if (value === true) {
    return "true";
  }
  return value;
}

export function renderAttributes(attrs: Record<string, AttributeValue> = {}): string {
  return Object.keys(attrs)
    .sort(compareStable)
    .flatMap((name) => {
      const value = renderAttributeValue(attrs[name]);
      return value === undefined ? [] : [`${name}="${escapeAttribute(value)}"`];
    })
    .join(" ");
}

export function renderElement(spec: SvgElementSpec, depth = 0): string {
  const indent = "  ".repeat(depth);
  const attributes = renderAttributes(spec.attrs);
  const open = attributes.length > 0 ? `<${spec.name} ${attributes}>` : `<${spec.name}>`;
  if (spec.selfClosing || spec.children === undefined || spec.children.length === 0) {
    const close = attributes.length > 0 ? `<${spec.name} ${attributes} />` : `<${spec.name} />`;
    return `${indent}${close}`;
  }
  const children = spec.children
    .map((child) =>
      typeof child === "string"
        ? `${"  ".repeat(depth + 1)}${escapeText(child)}`
        : renderElement(child, depth + 1)
    )
    .join("\n");
  return `${indent}${open}\n${children}\n${indent}</${spec.name}>`;
}

const CHARACTER_WIDTH_FACTORS: Record<string, number> = {
  " ": 0.33,
  "!": 0.32,
  '"': 0.42,
  "#": 0.67,
  $: 0.62,
  "%": 0.88,
  "&": 0.76,
  "'": 0.22,
  "(": 0.36,
  ")": 0.36,
  "*": 0.5,
  "+": 0.68,
  ",": 0.28,
  "-": 0.36,
  ".": 0.28,
  "/": 0.36,
  "0": 0.62,
  "1": 0.5,
  "2": 0.62,
  "3": 0.62,
  "4": 0.64,
  "5": 0.62,
  "6": 0.62,
  "7": 0.58,
  "8": 0.62,
  "9": 0.62,
  ":": 0.3,
  ";": 0.3,
  "<": 0.68,
  "=": 0.68,
  ">": 0.68,
  "?": 0.56,
  "@": 0.95,
  A: 0.72,
  B: 0.7,
  C: 0.74,
  D: 0.76,
  E: 0.66,
  F: 0.62,
  G: 0.78,
  H: 0.76,
  I: 0.32,
  J: 0.48,
  K: 0.72,
  L: 0.6,
  M: 0.9,
  N: 0.78,
  O: 0.8,
  P: 0.66,
  Q: 0.8,
  R: 0.72,
  S: 0.66,
  T: 0.64,
  U: 0.76,
  V: 0.72,
  W: 1,
  X: 0.72,
  Y: 0.68,
  Z: 0.66,
  "[": 0.34,
  "\\": 0.36,
  "]": 0.34,
  "^": 0.52,
  _: 0.58,
  "`": 0.32,
  a: 0.56,
  b: 0.6,
  c: 0.54,
  d: 0.6,
  e: 0.56,
  f: 0.34,
  g: 0.6,
  h: 0.58,
  i: 0.24,
  j: 0.28,
  k: 0.54,
  l: 0.24,
  m: 0.86,
  n: 0.58,
  o: 0.58,
  p: 0.6,
  q: 0.6,
  r: 0.38,
  s: 0.52,
  t: 0.34,
  u: 0.58,
  v: 0.54,
  w: 0.78,
  x: 0.54,
  y: 0.54,
  z: 0.52,
  "{": 0.4,
  "|": 0.28,
  "}": 0.4,
  "~": 0.68,
};

export function measureText(label: string, fontSize: number): number {
  let width = 0;
  for (const character of label) {
    width += CHARACTER_WIDTH_FACTORS[character] ?? 0.9;
  }
  return width * fontSize;
}
