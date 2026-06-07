/** Per-character width factors for deterministic text measurement. */
export const CHARACTER_WIDTH_FACTORS: Record<string, number> = {
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

/** Interface for measuring text width. Deterministic, no DOM dependency. */
export interface TextMeasurer {
  /** Measure label width in pixels for the provided font size. */
  measure(label: string, fontSize: number): number;
}

/** Measure label width in pixels using deterministic per-character width factors. */
export function measureText(label: string, fontSize: number): number {
  let width = 0;
  for (const character of label) {
    width += CHARACTER_WIDTH_FACTORS[character] ?? 0.9;
  }
  return width * fontSize;
}

/** Create the default deterministic text measurer. */
export function createTextMeasurer(): TextMeasurer {
  return {
    measure(label: string, fontSize: number): number {
      return measureText(label, fontSize);
    },
  };
}
