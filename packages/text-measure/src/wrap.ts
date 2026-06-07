import { measureText } from "./measure";

/** Wrap a single-line label into measured word lines that fit within the provided width. */
export function wrapText(text: string, wrapWidth: number, fontSize: number): string[] {
  if (measureText(text, fontSize) <= wrapWidth) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    if (measureText(candidate, fontSize) <= wrapWidth) {
      currentLine = candidate;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
}
