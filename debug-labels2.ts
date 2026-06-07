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

function distanceFromEdge(rect: { y: number; height: number; strokeWidth: number }, edgeY: number) {
  const visualTop = rect.y - rect.strokeWidth;
  const visualBottom = rect.y + rect.height + rect.strokeWidth;
  return visualBottom <= edgeY ? edgeY - visualBottom : visualTop - edgeY;
}

// Multi-segment: (0,0)→(40,20)→(140,220) — label should be on seg 2 only
const doc1 = document({ nodes: [{ id: "a", kind: "component", label: "A" }, { id: "b", kind: "component", label: "B" }], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY" }] });
const svg1 = renderSvgSync(doc1, { positionedDiagram: { document: doc1, nodes: [], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY", waypoints: [{ x: 0, y: 0 }, { x: 40, y: 20 }, { x: 140, y: 220 }] }], groups: [], activations: [], width: 160, height: 240 } } as any);
const r1 = extractLabelRects(svg1, "e1")[0]!;
const cY1 = r1.y + r1.h/2;
console.log("MULTI-SEG: y=" + r1.y + " h=" + r1.h + " sw=" + r1.sw + " centerY=" + cY1 + " x=" + r1.x + " w=" + r1.w);
console.log("  labelLeft=" + r1.x + " labelRight=" + (r1.x + r1.w));
// Edge Y at label center X on seg 2: t=(centerX-40)/100, Y=20+t*200
const labelCenterX = r1.x + r1.w/2;
const t = (labelCenterX - 40) / 100;
const edgeY = 20 + t * 200;
console.log("  edgeY at labelCenterX(" + labelCenterX + "): " + edgeY);
console.log("  distFromEdge(Y=" + edgeY + "): " + distanceFromEdge(r1, edgeY));

// Horizontal edge (regression guard)
const doc2 = document({ nodes: [{ id: "a", kind: "component", label: "A" }, { id: "b", kind: "component", label: "B" }], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY" }] });
const svg2 = renderSvgSync(doc2, { positionedDiagram: { document: doc2, nodes: [], edges: [{ id: "e1", kind: "calls", sourceId: "a", targetId: "b", label: "XY", waypoints: [{ x: 0, y: 100 }, { x: 100, y: 100 }] }], groups: [], activations: [], width: 120, height: 120 } } as any);
const r2 = extractLabelRects(svg2, "e1")[0]!;
const cY2 = r2.y + r2.h/2;
console.log("\nHORIZONTAL: y=" + r2.y + " h=" + r2.h + " sw=" + r2.sw + " centerY=" + cY2);
console.log("  distFromEdge(Y=100): " + distanceFromEdge(r2, 100));
