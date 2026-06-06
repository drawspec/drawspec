# Fix: SVG Label Occlusion Prevention

**Branch**: `fix/label-occlusion`
**Base**: `main`
**PR**: One commit, one fix.

## Problem

`packages/renderer-svg/src/renderer.ts:127` calls `avoidLabelOverlaps(labels)` with only the label array. No occlusion rects are passed, so labels only check against other labels. A label on node B that spatially overlaps node A's rect sits on top of it with no shift.

## Root Cause

Three pieces are missing:
1. `SvgLabelSpec` has no `ownerId` field — impossible to know which element a label belongs to.
2. No `OcclusionRect` type or `buildOcclusionRects()` function exists.
3. `avoidLabelOverlaps()` takes no occlusion rects parameter.

## Solution

### 1. Add `ownerId` to `SvgLabelSpec`

```ts
interface SvgLabelSpec {
  id: string;
  element: SvgElementSpec;
  bounds: LabelBounds;
  ownerId?: string;
}
```

### 2. Add `OcclusionRect` type

```ts
interface OcclusionRect {
  id: string;
  bounds: LabelBounds;
}
```

### 3. Add `buildOcclusionRects()`

Builds rects from positioned nodes and groups:

```ts
function buildOcclusionRects(
  diagram: PositionedDiagram
): OcclusionRect[] {
  const rects: OcclusionRect[] = [];
  for (const node of diagram.nodes) {
    rects.push({ id: node.id, bounds: { x: node.x, y: node.y, width: node.width, height: node.height } });
  }
  for (const group of diagram.groups) {
    rects.push({ id: group.id, bounds: { x: group.x, y: group.y, width: group.width, height: group.height } });
  }
  return rects;
}
```

### 4. Pass `ownerId` through label creation sites

- `renderGroup()` → `textElement({ ..., ownerId: group.id })`
- `renderNode()` → `textElement({ ..., ownerId: node.id })` 
- `renderEdge()` → `textElement({ ..., ownerId: edge.id })`
- `textElement()` → accept `ownerId` param, include in returned `SvgLabelSpec`

### 5. Extend `avoidLabelOverlaps()` with occlusion checking

```ts
function avoidLabelOverlaps(
  labels: readonly SvgLabelSpec[],
  occlusionRects: readonly OcclusionRect[] = []
): SvgLabelSpec[] {
  const placed: SvgLabelSpec[] = [];
  const adjusted: SvgLabelSpec[] = [];
  for (const label of [...labels].sort((a, b) => compareStable(a.id, b.id))) {
    let bounds = { ...label.bounds };
    let offsetX = 0;
    let offsetY = 0;
    // Check against placed labels
    for (const previous of placed) {
      if (!boundsOverlap(bounds, previous.bounds, 2)) continue;
      offsetY += previous.bounds.y + previous.bounds.height - bounds.y + 2;
      bounds = { ...bounds, y: bounds.y + offsetY };
      if (boundsOverlap(bounds, previous.bounds, 2)) {
        offsetX += previous.bounds.x + previous.bounds.width - bounds.x + 2;
        bounds = { ...bounds, x: bounds.x + offsetX };
      }
    }
    // Check against occlusion rects (skip own element)
    for (const rect of occlusionRects) {
      if (rect.id === label.ownerId) continue;
      if (!boundsOverlap(bounds, rect.bounds, 2)) continue;
      offsetY += rect.bounds.y + rect.bounds.height - bounds.y + 2;
      bounds = { ...bounds, y: bounds.y + offsetY };
    }
    const element = (offsetX !== 0 || offsetY !== 0)
      ? withTransform(label.element, `translate(${offsetX} ${offsetY})`)
      : label.element;
    const shifted = { ...label, element, bounds };
    placed.push(shifted);
    adjusted.push(shifted);
  }
  return adjusted;
}
```

### 6. Wire at the call site

```ts
const occlusionRects = buildOcclusionRects(positionedDiagram);
const adjustedLabels = avoidLabelOverlaps(labels, occlusionRects).map(l => l.element);
```

### 7. Update test expectations

- `renderer.test.ts:558` — shift changes from `translate(0 16)` to `translate(0 28.3)` (extra 12.3px to clear node rect)
- `text-quality.test.ts:183` — regex relax to accept float shifts

### 8. Regenerate golden fixtures

## Files Changed

| File | Change |
|---|---|
| `packages/renderer-svg/src/renderer.ts` | Add types, functions, wire occlusion |
| `packages/renderer-svg/src/__tests__/renderer.test.ts` | Update expected shift (line 547) |
| `packages/renderer-svg/src/__tests__/text-quality.test.ts` | Relax float regex (line 180) |
| Golden SVGs (10 files) | Regenerated |

## QA Scenarios

### Scenario 1: Overlapping node labels shift apart with occlusion
1. **Command**: `bun test packages/renderer-svg/src/__tests__/renderer.test.ts --test-name-pattern "shifts overlapping labels apart"`  
2. **Expected**: Test passes. Output SVG contains `transform="translate(0 28.3)"` (label shifts down 16px for label overlap + 12.3px for node rect occlusion).  
3. **Verify**: `grep -c 'translate(0 28.3)'` in test output.

### Scenario 2: Text quality occlusion test passes
1. **Command**: `bun test packages/renderer-svg/src/__tests__/text-quality.test.ts --test-name-pattern "shifts overlapping text"`  
2. **Expected**: Test passes. Regex `/transform="translate\([\d.]+ [\d.]+\)"/` matches the output (float transforms accepted).  

### Scenario 3: No regression on non-overlapping labels
1. **Command**: `bun run check`  
2. **Expected**: All 1029+ tests pass, typecheck clean, biome clean.

### Scenario 4: Golden fixtures match
1. **Command**: `bun test golden-freshness.test.ts`  
2. **Expected**: Passes — no `git diff` for golden files. (Run `DRAWSPEC_UPDATE_GOLDEN=1 UPDATE_GOLDEN=1 bun test --silent` first if fixtures changed.)

## Risks & Mitigations

- **Performance**: `buildOcclusionRects` + the occlusion loop are O(n*m) worst case. For typical diagrams (<100 elements, <100 labels) this is negligible. If perf becomes an issue, spatial indexing can be added later.
- **False positives**: A label that legitimately overlaps its own element's rect (e.g., a label inside a node) is handled by the `ownerId` skip.
