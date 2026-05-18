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

export function measureText(label: string, fontSize: number): number {
  return label.length * fontSize * 0.6;
}
