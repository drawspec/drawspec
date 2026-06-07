import { measureText } from "./measure";

/** Wrap text into lines that fit within the requested width without breaking words. */
export function wrapText(text: string, wrapWidth: number, fontSize: number): string[] {
  const hardLines = text.split("\n");
  const wrappedLines: string[] = [];

  for (const hardLine of hardLines) {
    const line = hardLine.trim();
    if (line.length === 0) {
      continue;
    }
    wrappedLines.push(...wrapSingleLine(line, wrapWidth, fontSize));
  }

  return wrappedLines;
}

function wrapSingleLine(text: string, wrapWidth: number, fontSize: number): string[] {
  if (measureText(text, fontSize) <= wrapWidth) {
    return [text];
  }

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (wrapWidth <= 0) {
    return words;
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    if (measureText(candidate, fontSize) <= wrapWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
}
