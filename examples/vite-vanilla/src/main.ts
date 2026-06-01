import { sequenceLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import diagramDoc from "./hello.sequence.ts";

async function main() {
  const engine = sequenceLayout();
  const positionedDiagram = await engine.layout(diagramDoc);
  const svg = await renderSvg(diagramDoc, { positionedDiagram });

  const container = document.querySelector<HTMLDivElement>("#diagram");
  if (container) {
    container.innerHTML = svg;
  }
}

main().catch(console.error);
