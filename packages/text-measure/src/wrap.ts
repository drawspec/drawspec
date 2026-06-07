import {
  measureRichText,
  measureText,
  type RichText,
  type RichTextSegment,
  type TextContent,
} from "./measure";

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

/** Wrap rich text into formatted lines that fit without breaking words. */
export function wrapRichText(text: RichText, wrapWidth: number, fontSize: number): RichText[] {
  const hardLines = splitRichTextHardLines(text);
  const wrappedLines: RichText[] = [];

  for (const hardLine of hardLines) {
    const words = richTextWords(hardLine);
    if (words.length === 0) {
      continue;
    }
    wrappedLines.push(...wrapRichTextWords(words, wrapWidth, fontSize));
  }

  return wrappedLines;
}

/** Wrap plain or rich text while preserving the input representation for each line. */
export function wrapTextContent<T extends TextContent>(
  text: T,
  wrapWidth: number,
  fontSize: number
): T extends string ? string[] : RichText[] {
  return (
    typeof text === "string"
      ? wrapText(text, wrapWidth, fontSize)
      : wrapRichText(text, wrapWidth, fontSize)
  ) as T extends string ? string[] : RichText[];
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

function splitRichTextHardLines(text: RichText): RichText[] {
  const lines: RichTextSegment[][] = [[]];
  for (const segment of text) {
    const parts = segment.text.split("\n");
    for (const [index, part] of parts.entries()) {
      if (index > 0) {
        lines.push([]);
      }
      if (part.length > 0) {
        lines[lines.length - 1]?.push({ ...segment, text: part });
      }
    }
  }
  return lines;
}

function richTextWords(text: RichText): RichText[] {
  const words: RichText[] = [];
  let currentWord: RichTextSegment[] = [];
  for (const segment of text) {
    for (const part of segment.text.split(/(\s+)/)) {
      if (part.length === 0) {
        continue;
      }
      if (/^\s+$/u.test(part)) {
        if (currentWord.length > 0) {
          words.push(mergeAdjacentSegments(currentWord));
          currentWord = [];
        }
        continue;
      }
      currentWord.push({ ...segment, text: part });
    }
  }
  if (currentWord.length > 0) {
    words.push(mergeAdjacentSegments(currentWord));
  }
  return words;
}

function wrapRichTextWords(
  words: readonly RichText[],
  wrapWidth: number,
  fontSize: number
): RichText[] {
  if (measureRichText(joinWords(words), fontSize) <= wrapWidth) {
    return [joinWords(words)];
  }

  if (wrapWidth <= 0) {
    return words.map((word) => joinWords([word]));
  }

  const lines: RichText[] = [];
  let currentLine: RichText[] = [];
  for (const word of words) {
    const candidate = [...currentLine, word];
    if (measureRichText(joinWords(candidate), fontSize) <= wrapWidth) {
      currentLine = candidate;
      continue;
    }
    if (currentLine.length > 0) {
      lines.push(joinWords(currentLine));
    }
    currentLine = [word];
  }

  if (currentLine.length > 0) {
    lines.push(joinWords(currentLine));
  }
  return lines;
}

function joinWords(words: readonly RichText[]): RichText {
  const segments: RichTextSegment[] = [];
  for (const [index, word] of words.entries()) {
    if (index > 0) {
      segments.push({ text: " " });
    }
    segments.push(...word);
  }
  return mergeAdjacentSegments(segments);
}

function mergeAdjacentSegments(segments: readonly RichTextSegment[]): RichText {
  const merged: RichTextSegment[] = [];
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && sameFormatting(previous, segment)) {
      merged[merged.length - 1] = { ...previous, text: `${previous.text}${segment.text}` };
      continue;
    }
    merged.push(segment);
  }
  return merged;
}

function sameFormatting(left: RichTextSegment, right: RichTextSegment): boolean {
  return (
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.code === right.code &&
    left.href === right.href
  );
}
