import type { LabelContent, RichText, TextSegment } from "./types";

/** Returns true when label content is structured rich text. */
export function isRichText(label: LabelContent): label is RichText {
  return Array.isArray(label);
}

/** Converts label content to plain text by concatenating rich text segments. */
export function labelToPlainText(label: LabelContent): string {
  return typeof label === "string" ? label : label.map((segment) => segment.text).join("");
}

/** Creates a rich text label from formatted segments. */
export function richText(...segments: readonly TextSegment[]): RichText {
  return segments.filter((segment) => segment.text.length > 0);
}

/** Parses simple Markdown-style inline formatting into rich text label segments. */
export function parseRichText(markdown: string): RichText {
  const segments: TextSegment[] = [];
  let index = 0;
  while (index < markdown.length) {
    const code = markdown.indexOf("`", index);
    const bold = markdown.indexOf("**", index);
    const italic = markdown.indexOf("*", index);
    const next = nextMarker(code, bold, italic);
    if (next === -1) {
      pushSegment(segments, { text: markdown.slice(index) });
      break;
    }
    if (next > index) {
      pushSegment(segments, { text: markdown.slice(index, next) });
    }
    if (next === code) {
      const end = markdown.indexOf("`", next + 1);
      if (end === -1) {
        pushSegment(segments, { text: markdown.slice(next) });
        break;
      }
      pushSegment(segments, { text: markdown.slice(next + 1, end), code: true });
      index = end + 1;
      continue;
    }
    if (next === bold) {
      const end = markdown.indexOf("**", next + 2);
      if (end === -1) {
        pushSegment(segments, { text: markdown.slice(next) });
        break;
      }
      pushSegment(segments, { text: markdown.slice(next + 2, end), bold: true });
      index = end + 2;
      continue;
    }
    const end = markdown.indexOf("*", next + 1);
    if (end === -1) {
      pushSegment(segments, { text: markdown.slice(next) });
      break;
    }
    pushSegment(segments, { text: markdown.slice(next + 1, end), italic: true });
    index = end + 1;
  }
  return segments;
}

function nextMarker(...indexes: readonly number[]): number {
  return indexes.filter((value) => value >= 0).sort((left, right) => left - right)[0] ?? -1;
}

function pushSegment(segments: TextSegment[], segment: TextSegment): void {
  if (segment.text.length === 0) return;
  const previous = segments[segments.length - 1];
  if (previous !== undefined && sameFormatting(previous, segment)) {
    segments[segments.length - 1] = { ...previous, text: `${previous.text}${segment.text}` };
    return;
  }
  segments.push(segment);
}

function sameFormatting(left: TextSegment, right: TextSegment): boolean {
  return (
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.code === right.code &&
    left.href === right.href
  );
}
