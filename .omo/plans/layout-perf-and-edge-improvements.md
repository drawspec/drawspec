# Plan: Layout Performance + Edge Routing + Label Backgrounds

**Branch**: `feat/layout-perf-edge-improvements`
**Base**: `main`
**PR**: One commit per concern, single PR.

## Overview

Three related changes to the layout and rendering pipeline:
1. Optimize `minimizeCrossings()` performance (layout package)
2. Add curved edge routing + smooth orthogonal corners (layout + renderer)
3. Add edge label backgrounds with line interruption (renderer)

## Task 1: Optimize Layout Crossing Minimization

### Problem
`minimizeCrossings()` in `packages/layout/src/graph.ts` causes 4-5x benchmark regression on large graphs (10K elements: 163ms → ~970ms). The algorithm is correct (Sugiyama barycenter) but the implementation has quadratic constant factors.

### Changes — `packages/layout/src/graph.ts`

#### 1a. Pre-compute edge adjacency maps
Build `Map<string, DiagramEdge[]>` keyed by `${sourceRank}-${targetRank}` once before the iteration loop. Replace all `sortedConnectedEdges()` calls with map lookups.

```ts
// Before the iteration loop in minimizeCrossings():
const edgeMap = new Map<string, DiagramEdge[]>();
for (const edge of edges) {
  const srcRank = depths[edge.sourceId];
  const tgtRank = depths[edge.targetId];
  if (srcRank !== undefined && tgtRank !== undefined && edge.sourceId !== edge.targetId) {
    const key = `${srcRank}-${tgtRank}`;
    const list = edgeMap.get(key) ?? [];
    list.push(edge);
    edgeMap.set(key, list);
  }
}
// Sort each bucket once
for (const [key, list] of edgeMap) {
  list.sort((a, b) => a.id.localeCompare(b.id));
  edgeMap.set(key, list);
}
```

Replace `sortedConnectedEdges(edges, depths, srcRank, tgtRank)` calls with `edgeMap.get(\`${srcRank}-${tgtRank}\`) ?? []`.

#### 1b. Cache barycenters before sorting
Compute barycenter for all nodes in a layer in one pass, then sort by cached values.

```ts
function reorderLayerByBarycenter(
  layer: DiagramNode[],
  edges: DiagramEdge[],
  neighborIndexes: Record<string, number>,
  useSources: boolean
): DiagramNode[] {
  // Pre-compute barycenters
  const baryMap = new Map<string, number>();
  for (const node of layer) {
    baryMap.set(node.id, barycenterForNode(node.id, edges, neighborIndexes, useSources));
  }

  const previousIndexes: Record<string, number> = {};
  for (const [index, node] of layer.entries()) {
    previousIndexes[node.id] = index;
  }

  return [...layer].sort((left, right) => {
    const leftCenter = baryMap.get(left.id) ?? Number.POSITIVE_INFINITY;
    const rightCenter = baryMap.get(right.id) ?? Number.POSITIVE_INFINITY;
    if (leftCenter !== rightCenter) return leftCenter - rightCenter;
    const previousOrder = (previousIndexes[left.id] ?? 0) - (previousIndexes[right.id] ?? 0);
    return previousOrder === 0 ? left.id.localeCompare(right.id) : previousOrder;
  });
}
```

#### 1c. Cap iterations
Change `maxIterations = Math.max(1, nodes.length * 2)` to a fixed cap of 24. The barycenter method converges in 3-5 passes; 24 is generous.

```ts
const maxIterations = 24;
```

#### 1d. Fix computeDepths Set lookup
Replace `nodeIds: string[]` with `Set<string>` for O(1) lookups.

```ts
const nodeSet = new Set(nodes.map((node) => node.id));
const usefulEdges = edges.filter(
  (edge) => edge.sourceId !== edge.targetId && nodeSet.has(edge.sourceId) && nodeSet.has(edge.targetId)
);
```

### Files Changed
| File | Change |
|---|---|
| `packages/layout/src/graph.ts` | Pre-compute edge maps, cache barycenters, cap iterations, fix Set lookup |

### QA
1. `bun test packages/layout/` — all layout tests pass
2. `bun test packages/renderer-svg/` — all renderer tests pass (layout output unchanged)
3. `bun run check` — clean
4. Benchmark: `DRAWSPEC_RUN_BENCH=1 bun test --bench packages/layout/src/__bench__/layout.bench.ts` — 10K graph should be ~200-300ms

---

## Task 2: Curved Edge Routing + Smooth Orthogonal Corners

### Problem
Edges are rendered as straight line segments (`M ... L ... L ...`). No curve support exists. Orthogonal paths have sharp 90° corners.

### Design

#### Layout: Add `"curved"` routing mode

**`packages/layout/src/types.ts`**:
```ts
export type LayoutRouting = "straight" | "orthogonal" | "curved";
```

**`packages/layout/src/graph.ts`** — add `curvedWaypoints()`:
For curved routing, generate smooth Bezier control points through the midpoint between source and target. The waypoints become a gentle arc rather than a direct line.

```ts
function curvedWaypoints(
  sourceCenter: Point,
  targetCenter: Point,
  offset: number,
  isHorizontal: boolean
): Point[] {
  // Single arc with control point offset perpendicular to the edge direction
  const mid = {
    x: (sourceCenter.x + targetCenter.x) / 2,
    y: (sourceCenter.y + targetCenter.y) / 2,
  };
  if (isHorizontal) {
    mid.y += offset;
  } else {
    mid.x += offset;
  }
  return [sourceCenter, mid, targetCenter];
}
```

Wire into `edgeWaypoints()` alongside existing `straightWaypoints` and `orthogonalWaypoints`.

#### Renderer: Bezier path generation with smooth corners

**`packages/renderer-svg/src/renderer.ts`** — update `edgePath()`:

The current `edgePath()` only generates `M ... L ...` SVG path commands. Update it to:
- For `"straight"` routing: same as now (`M L L`)
- For `"orthogonal"` routing: use `M ... L ... Q ... L ...` (quadratic Bezier at corners for smooth arcs). Corner radius: ~8px.
- For `"curved"` routing: use `M ... C ... ... ...` (cubic Bezier through waypoints). The waypoints from layout include the arc control point.

```ts
function edgePath(points: Point[], routing?: LayoutRouting): string {
  const [first, ...rest] = points;
  if (first === undefined) return "M 0 0";

  if (routing === "curved" && rest.length >= 2) {
    // Cubic Bezier: M start C ctrl1 ctrl2 end
    const last = rest[rest.length - 1];
    const mid = rest[0]; // layout provides the arc midpoint
    return [
      `M ${fmt(first.x)} ${fmt(first.y)}`,
      `Q ${fmt(mid.x)} ${fmt(mid.y)} ${fmt(last.x)} ${fmt(last.y)}`,
    ].join(" ");
  }

  if (routing === "orthogonal" && rest.length >= 3) {
    // Smooth corners with quadratic Bezier
    const parts = [`M ${fmt(first.x)} ${fmt(first.y)}`];
    const cornerRadius = 8;
    for (let i = 0; i < rest.length; i++) {
      const prev = i === 0 ? first : rest[i - 1];
      const curr = rest[i];
      const next = rest[i + 1];
      if (next !== undefined && isCorner(prev, curr, next)) {
        // Insert smooth corner
        const before = approachPoint(curr, prev, cornerRadius);
        const after = approachPoint(curr, next, cornerRadius);
        parts.push(`L ${fmt(before.x)} ${fmt(before.y)}`);
        parts.push(`Q ${fmt(curr.x)} ${fmt(curr.y)} ${fmt(after.x)} ${fmt(after.y)}`);
      } else {
        parts.push(`L ${fmt(curr.x)} ${fmt(curr.y)}`);
      }
    }
    return parts.join(" ");
  }

  // Straight (default)
  return [
    `M ${fmt(first.x)} ${fmt(first.y)}`,
    ...rest.map((p) => `L ${fmt(p.x)} ${fmt(p.y)}`),
  ].join(" ");
}
```

Helper functions:
```ts
function isCorner(prev: Point, curr: Point, next: Point): boolean {
  // Corner = direction change between prev→curr and curr→next
  const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
  return dx1 * dx2 + dy1 * dy2 === 0; // perpendicular = corner
}

function approachPoint(corner: Point, from: Point, radius: number): Point {
  const dx = corner.x - from.x, dy = corner.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const r = Math.min(radius, len / 2);
  return { x: corner.x - (dx / len) * r, y: corner.y - (dy / len) * r };
}
```

#### Thread routing through renderer
The renderer needs to know the routing mode. Thread it through `SvgRenderOptions` or derive it from the layout options stored on the document.

Option: Add `routing` to the `PositionedDiagram` metadata or pass through render options. Simplest: read from `document.layout?.routing` in the renderer, defaulting to `"straight"`.

### Files Changed
| File | Change |
|---|---|
| `packages/layout/src/types.ts` | Add `"curved"` to `LayoutRouting` |
| `packages/layout/src/graph.ts` | Add `curvedWaypoints()`, wire into `edgeWaypoints()` |
| `packages/renderer-svg/src/renderer.ts` | Update `edgePath()` for curved/orthogonal-smooth, thread routing |

### QA
1. `bun test packages/layout/` — pass
2. `bun test packages/renderer-svg/` — pass (update golden fixtures for orthogonal corners)
3. Visual: render a graph with `routing: "curved"` and verify smooth arcs
4. Visual: render a graph with `routing: "orthogonal"` and verify rounded corners
5. `bun run check` — clean

---

## Task 3: Edge Label Backgrounds (Line Interruption)

### Problem
Edge labels sit on top of edges with no background, making text hard to read when the label overlaps the line.

### Design

Add a `<rect>` behind each edge label `<text>` element, matching the diagram background color. This creates a "gap" in the line behind the label text, making it readable without drawing attention to the background itself.

#### Renderer changes — `packages/renderer-svg/src/renderer.ts`

In `renderEdge()`, when the edge has a label, insert a background `<rect>` before the `<text>` element:

```ts
// In the textElement function or after label creation:
// Add a background rect matching the theme background
const labelBg: SvgElementSpec = {
  name: "rect",
  attrs: {
    x: labelX - textWidth / 2 - 4,  // 4px horizontal padding
    y: labelY - fontSize - 2,         // 2px vertical padding above baseline
    width: textWidth + 8,
    height: fontSize + 4,
    rx: 3,                            // subtle rounding
    ry: 3,
    fill: themeBackground,            // matches diagram background
  },
  selfClosing: true,
};
```

The background color should come from the resolved theme (`theme.background`).

#### Style support — `packages/renderer-svg/src/styles.ts`

Add to `ResolvedStyle`:
```ts
/** Background color for edge labels. Defaults to theme background. */
labelBg?: string;
```

Default: `theme.background` (so the rect is invisible against the diagram background — just interrupts the line).

Customizable: users can set `labelBg` to any color (e.g., `"white"`, `"#f0f0f0"`) for a visible label pill.

#### Implementation approach
The label background must be inserted as a sibling BEFORE the `<text>` in the text layer, so the text renders on top. Since labels are collected into the text layer group, the background rect needs to be part of the label element.

Best approach: modify `textElement()` to optionally include a background rect in its output. Add a `showBackground` / `backgroundFill` parameter.

```ts
interface TextElementOptions {
  // ... existing fields
  backgroundFill?: string;
}
```

When `backgroundFill` is provided, the returned `SvgElementSpec` wraps both the rect and the text in a `<g>`, with the rect as the first child.

### Files Changed
| File | Change |
|---|---|
| `packages/renderer-svg/src/renderer.ts` | Add background rect to edge labels, thread theme background |
| `packages/renderer-svg/src/styles.ts` | Add `labelBg` to `ResolvedStyle` |
| `packages/renderer-svg/src/types.ts` | Add `labelBg` to style types if needed |

### QA
1. `bun test packages/renderer-svg/` — pass (update golden fixtures)
2. Visual: edge labels should have invisible background that interrupts the line
3. Visual: custom `labelBg: "white"` should show a visible white pill behind labels
4. `bun run check` — clean

---

## Execution Order

1. **Task 1** (layout perf) — independent, do first
2. **Task 2** (curved routing) — layout changes are independent of Task 3
3. **Task 3** (label backgrounds) — renderer changes, can be done after or parallel with Task 2
4. **Update benchmarks baseline** — after all tasks, recapture `benchmarks/baseline.json`
5. **Regenerate golden fixtures** — final step

## Risks

- **Golden fixture churn**: Orthogonal corner smoothing and label backgrounds change all golden SVGs with edge labels. Expected — regenerate once at the end.
- **Bezier math**: Curved path generation needs careful control point calculation. Test with various graph shapes (linear, branching, cyclic).
- **Performance**: Label background rendering adds one `<rect>` per edge label. Negligible for typical diagrams (<100 edges).
