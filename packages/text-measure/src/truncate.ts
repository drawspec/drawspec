import { measureText } from "./measure";

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
