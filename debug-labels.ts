import type { DiagramDocument } from "@drawspec/core";
import { renderSvgSync } from "./packages/renderer-svg/src/index.ts";

function document(overrides: Partial<DiagramDocument> = {}): DiagramDocument {
  return { annotations: [], edges: [], groups: [], id: "doc", kind: "graph", nodes: [], schemaVersion: "1.0.0", ...overrides } as DiagramDocument;
}

function extractLabelRects(svg: string, edgeId: string) {
  const rects: any[] = [];
  const gRegex = new RegExp(`<g id="[^"]*label-edge-${edgeId}-line\\d+[^"]*"[^>]*>[\\s\\S]*?<rect[^>]*\\/>`, "g");
  for (const m of svg.matchAll(gRegex)) {
    const y = m[0].match(/\by="([^"]*)"/); const h = m[0].match(/\bheight="([^"]*)"/);
    const x = m[0].match(/\bx="([^"]*)"/); const w = m[0].match(/\bwidth="([^"]*)"/);
    const sw = m[0].match(/\bstroke-width="([^"]*)"/);
    if (y && h && x && w) rects.push({ y: +y[1], h: +h[1], x: +x[1], w: +w[1], sw: sw ? +sw[1] : 0 });
  }
  return rects;
}

// Steep diagonal (0,0)→(100,200)
const doc1 = document({ nodes: [{ id: "a", kind: "component", label: "A" }, { id: "b", kind: "component", label: "B" }], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY" }] });
const svg1 = renderSvgSync(doc1, { positionedDiagram: { document: doc1, nodes: [], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY", waypoints: [{ x: 0, y: 0 }, { x: 100, y: 200 }] }], groups: [], activations: [], width: 120, height: 220 } } as any);
const r1 = extractLabelRects(svg1, "e1")[0]!;
console.log("STEEP: y=" + r1.y + " h=" + r1.h + " sw=" + r1.sw + " centerY=" + (r1.y + r1.h/2));
console.log("  visualTop=" + (r1.y - r1.sw) + " visualBottom=" + (r1.y + r1.h + r1.sw));
console.log("  distFromEdge(Y=100): " + ((r1.y + r1.h + r1.sw) <= 100 ? 100 - (r1.y + r1.h + r1.sw) : (r1.y - r1.sw) - 100));

// V-shape (0,0)→(50,100)→(100,0)
const doc2 = document({ nodes: [{ id: "a", kind: "component", label: "A" }, { id: "b", kind: "component", label: "B" }], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY" }] });
const svg2 = renderSvgSync(doc2, { positionedDiagram: { document: doc2, nodes: [], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY", waypoints: [{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }] }], groups: [], activations: [], width: 120, height: 120 } } as any);
const r2 = extractLabelRects(svg2, "e1")[0]!;
console.log("V-SHAPE: y=" + r2.y + " h=" + r2.h + " sw=" + r2.sw + " centerY=" + (r2.y + r2.h/2));
console.log("  visualTop=" + (r2.y - r2.sw) + " visualBottom=" + (r2.y + r2.h + r2.sw));
console.log("  distFromEdge(Y=100): " + ((r2.y + r2.h + r2.sw) <= 100 ? 100 - (r2.y + r2.h + r2.sw) : (r2.y - r2.sw) - 100));
