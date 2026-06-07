export const CHARACTER_WIDTH_FACTORS: Readonly<Record<string, number>> = Object.freeze({
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
} as const);

const BOLD_WIDTH_MULTIPLIER = 1.08;
const ITALIC_WIDTH_MULTIPLIER = 1.02;
const MONOSPACE_WIDTH_FACTOR = 0.62;

/** Formatted text segment accepted by deterministic rich text measurement helpers. */
export interface RichTextSegment {
  /** Segment text content. */
  readonly text: string;
  /** Whether this segment uses bold weight. */
  readonly bold?: boolean;
  /** Whether this segment uses italic style. */
  readonly italic?: boolean;
  /** Whether this segment uses monospace code metrics. */
  readonly code?: boolean;
  /** Link target carried through measurement-preserving transforms. */
  readonly href?: string;
}

/** Rich text label content measured as a sequence of formatted segments. */
export type RichText = readonly RichTextSegment[];

/** Text content accepted by deterministic text measurement helpers. */
export type TextContent = string | RichText;

/** Interface for measuring text width. Deterministic, no DOM dependency. */
export interface TextMeasurer {
  /** Measure label width in pixels for the provided font size. */
  measure(label: TextContent, fontSize: number): number;
}

/** Measure label width in pixels using deterministic per-character width factors. */
export function measureText(label: string, fontSize: number): number {
  let width = 0;
  for (const character of label) {
    width += CHARACTER_WIDTH_FACTORS[character] ?? 0.9;
  }
  return width * fontSize;
}

/** Measure rich text width in pixels using deterministic segment style multipliers. */
export function measureRichText(label: RichText, fontSize: number): number {
  return label.reduce((sum, segment) => sum + measureSegment(segment, fontSize), 0);
}

/** Measure plain or rich text content in pixels. */
export function measureTextContent(label: TextContent, fontSize: number): number {
  return typeof label === "string"
    ? measureText(label, fontSize)
    : measureRichText(label, fontSize);
}

/** Create the default deterministic text measurer. */
export function createTextMeasurer(): TextMeasurer {
  return {
    measure(label: TextContent, fontSize: number): number {
      return measureTextContent(label, fontSize);
    },
  };
}

function measureSegment(segment: RichTextSegment, fontSize: number): number {
  const baseWidth = segment.code
    ? [...segment.text].length * MONOSPACE_WIDTH_FACTOR * fontSize
    : measureText(segment.text, fontSize);
  const boldWidth = segment.bold ? baseWidth * BOLD_WIDTH_MULTIPLIER : baseWidth;
  return segment.italic ? boldWidth * ITALIC_WIDTH_MULTIPLIER : boldWidth;
}
