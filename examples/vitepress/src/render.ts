import { sequenceLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import type { DiagramDocument } from "@drawspec/core";

/**
 * Renders a DrawSpec DiagramDocument to an SVG string.
 * Intended for use in VitePress markdown via Vue enhanced blocks.
 */
export async function renderDiagram(document: DiagramDocument): Promise<string> {
  const engine = sequenceLayout();
  const positionedDiagram = await engine.layout(document);
  return renderSvg(document, { positionedDiagram });
}
