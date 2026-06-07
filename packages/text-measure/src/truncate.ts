import { measureRichText, measureText, type RichText, type RichTextSegment } from "./measure";

const ELLIPSIS = "…";

/** Truncate a label with an ellipsis so it fits within the provided maximum width. */
export function truncateText(label: string, maxWidth: number, fontSize: number): string {
  if (measureText(label, fontSize) <= maxWidth) {
    return label;
  }

  if (measureText(ELLIPSIS, fontSize) >= maxWidth) {
    return ELLIPSIS;
  }

  const characters = [...label];
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${characters.slice(0, mid).join("")}${ELLIPSIS}`;
    if (measureText(candidate, fontSize) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return `${characters.slice(0, low).join("")}${ELLIPSIS}`;
}

/** Truncate rich text with an ellipsis so it fits within the provided maximum width. */
export function truncateRichText(label: RichText, maxWidth: number, fontSize: number): RichText {
  if (measureRichText(label, fontSize) <= maxWidth) {
    return label;
  }

  if (measureText(ELLIPSIS, fontSize) >= maxWidth) {
    return [{ text: ELLIPSIS }];
  }

  const characters = richTextCharacters(label);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = appendEllipsis(charactersToRichText(characters.slice(0, mid)));
    if (measureRichText(candidate, fontSize) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return appendEllipsis(charactersToRichText(characters.slice(0, low)));
}

/** Truncate plain or rich text while preserving the input representation. */
export function truncateTextContent<T extends string | RichText>(
  label: T,
  maxWidth: number,
  fontSize: number
): T {
  return (
    typeof label === "string"
      ? truncateText(label, maxWidth, fontSize)
      : truncateRichText(label, maxWidth, fontSize)
  ) as T;
}

type RichTextCharacter = Omit<RichTextSegment, "text"> & { text: string };

function richTextCharacters(label: RichText): RichTextCharacter[] {
  return label.flatMap((segment) =>
    [...segment.text].map((character) => ({ ...segment, text: character }))
  );
}

function charactersToRichText(characters: readonly RichTextCharacter[]): RichText {
  const segments: RichTextSegment[] = [];
  for (const character of characters) {
    const previous = segments[segments.length - 1];
    if (previous !== undefined && sameFormatting(previous, character)) {
      segments[segments.length - 1] = { ...previous, text: `${previous.text}${character.text}` };
      continue;
    }
    segments.push(character);
  }
  return segments;
}

function appendEllipsis(label: RichText): RichText {
  return [...label, { text: ELLIPSIS }];
}

function sameFormatting(left: RichTextSegment, right: RichTextSegment): boolean {
  return (
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.code === right.code &&
    left.href === right.href
  );
}
