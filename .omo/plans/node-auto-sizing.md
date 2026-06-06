# Plan: Node Auto-Sizing to Fit Labels

**Branch**: `feat/node-auto-sizing`
**Base**: `main`
**Issue**: Nodes have fixed 120×56 size regardless of label text. Labels get truncated with "…". Need auto-sizing, word-wrapping, and configurable overrides.

## Architecture (Oracle-Reviewed)

**Core principle**: Layout must know true node dimensions *before* positioning. A pre-layout sizing step computes node sizes from label text using a deterministic text measurer. The renderer consumes these pre-computed sizes and label layouts.

### Key Decisions

1. **Pre-layout sizing** — new `sizeGraphNodes()` function in `@drawspec/layout`, called before `positionGraphNodes()`.
2. **`TextMeasurer` interface** — deterministic, renderer-agnostic. Default uses existing per-character width factors from `renderer-svg/src/svg.ts`.
3. **Per-node sizing via `DiagramNode.layout?: NodeLayoutOptions`** — not top-level `width`/`height`.
4. **Variable-width layer placement** — x positions accumulate actual node widths + spacing.
5. **Same measurer in layout AND renderer** — consistency over accuracy.
6. **Phased rollout** — Phase 1 adds types + sizing behind `"fixed"` mode, Phase 2 enables `"auto"` by default.

## Types

### `packages/core/src/types.ts` — add to `DiagramNode`:

```ts
export interface NodeLayoutOptions {
  /** Explicit width override. When set, disables auto-width for this node. */
  width?: number;
  /** Explicit height override. When set, disables auto-height for this node. */
  height?: number;
  /** Minimum width. Defaults to global minSize.width. */
  minWidth?: number;
  /** Minimum height. Defaults to global minSize.height. */
  minHeight?: number;
  /** Maximum width. When hit, enables wrapping then truncation. */
  maxWidth?: number;
  /** Maximum height. When hit, truncates visible lines. */
  maxHeight?: number;
  /** Horizontal and vertical padding around label text. */
  padding?: Partial<{ x: number; y: number }>;
  /** Label wrapping behavior. Defaults to global setting. */
  labelWrap?: "none" | "auto" | number;
}
```

### `packages/layout/src/types.ts` — add:

```ts
export interface NodeSizingOptions {
  /** Sizing mode. "auto" measures labels, "fixed" uses defaultSize. Default: "auto". */
  mode?: "auto" | "fixed";
  /** Base size when mode is "fixed", or minimum size for "auto". Default: 120×56. */
  defaultSize?: Partial<Size>;
  /** Minimum node size. Default: 60×40. */
  minSize?: Partial<Size>;
  /** Maximum node size. Nodes exceeding this get truncation. Default: unbounded. */
  maxSize?: Partial<Size>;
  /** Padding around label text. Default: { x: 16, y: 10 }. */
  padding?: { x: number; y: number };
  /** Global label wrapping. "none" = single line + ellipsis, "auto" = wrap at maxWidth, number = wrap at this width. Default: "none". */
  labelWrap?: "none" | "auto" | number;
  /** Text style for measurement. Must match renderer's font. */
  typography?: TextStyle;
}

export interface TextStyle {
  fontSize?: number;    // default: 14
  fontFamily?: string;  // default: "Arial, sans-serif"
}

export interface TextMeasurer {
  measure(label: string, fontSize: number): number;
}

/** A node with computed dimensions, produced by sizeGraphNodes(). */
export interface SizedNode extends DiagramNode {
  measuredWidth: number;
  measuredHeight: number;
  labelLines: string[];
}
```

### `packages/layout/src/options.ts` — extend `NormalizedLayoutOptions`:

Add `sizing: NormalizedNodeSizingOptions` field. Defaults:
- `mode: "auto"`
- `defaultSize: { width: 120, height: 56 }`
- `minSize: { width: 60, height: 40 }`
- `padding: { x: 16, y: 10 }`
- `labelWrap: "none"`
- `typography: { fontSize: 14, fontFamily: "Arial, sans-serif" }`

## Implementation Steps

### Phase 1: Types + Text Measurement Infrastructure

**Files**: `packages/core/src/types.ts`, `packages/layout/src/types.ts`, `packages/layout/src/options.ts`, `packages/layout/src/measure.ts`

1. Add `NodeLayoutOptions` to core types
2. Add `NodeSizingOptions`, `TextStyle`, `TextMeasurer`, `SizedNode` to layout types
3. Extract `CHARACTER_WIDTH_FACTORS` from `packages/renderer-svg/src/svg.ts` into a shared module at `packages/layout/src/measure.ts`
4. Create `defaultTextMeasurer(): TextMeasurer` using the character width factors
5. Extend `normalizeLayoutOptions()` to include sizing defaults
6. Update `DiagramNode` in core to include `layout?: NodeLayoutOptions`

### Phase 2: Pre-Layout Sizing Function

**File**: `packages/layout/src/sizing.ts`

Create `sizeGraphNodes()`:

```ts
function sizeGraphNodes(
  nodes: DiagramNode[],
  options: NormalizedNodeSizingOptions,
  measurer: TextMeasurer
): SizedNode[]
```

Logic per node:
1. Start with global defaults (minSize, padding, typography, labelWrap)
2. Apply per-node `node.layout` overrides
3. If `mode === "fixed"` or both `width` and `height` are explicit → use fixed size
4. If auto:
   a. Compute label lines (handle `\n`, wrapping)
   b. Measure widest line with `measurer.measure()`
   c. Content width = max line width + 2 × padding.x
   d. Content height = (lines.length × lineHeight) + 2 × padding.y
   e. Clamp to [minSize, maxSize]
5. Return `SizedNode` with `measuredWidth`, `measuredHeight`, `labelLines`

### Phase 3: Variable-Width Layout

**File**: `packages/layout/src/graph.ts`

Update `positionGraphNodes()`:
- Accept `SizedNode[]` instead of `DiagramNode[]`
- Within each layer, compute x positions by accumulating `measuredWidth + spacing.node` (not uniform width × index)
- Use each node's own `measuredWidth`/`measuredHeight` for positioned output
- Edge routing: compute `centerOf()` from actual dimensions (already works since PositionedNode has width/height)

### Phase 4: Renderer Integration

**File**: `packages/renderer-svg/src/renderer.ts`

1. `textElement()` for nodes: use `labelLines` from layout output instead of computing truncation
2. Multi-line rendering: render each line as a separate `<text>` or `<tspan>` element
3. Remove per-node `truncateText()` when layout provides pre-computed lines
4. Keep `truncateText()` as fallback for edge labels (not auto-sized)

### Phase 5: Builder + Docs Updates

1. Update diagram builders (architecture, UML packages) to support `node.layout` options
2. Update docs engine examples
3. Update Serena memories

## Sizing Resolution Order

For each node:
1. Resolve global defaults → per-node overrides
2. If both `width` and `height` explicit → fixed size, clamp to min/max
3. If one dimension explicit → compute other from label
4. If auto:
   - Wrap label per `labelWrap` setting
   - Measure widest line
   - Add padding
   - Clamp to min/max
   - If exceeds maxWidth → wrap, then truncate with "…"
5. Never smaller than `minSize`

## Per-Phase QA

### Phase 1 QA: Types + Text Measurement
```
bun run build
bun test packages/layout/
```
- New types compile without errors
- `defaultTextMeasurer()` produces same widths as `measureText()` in `renderer-svg/src/svg.ts` for identical inputs
- Unit test: `measureText("Hello", 14)` returns same value from both measurers
- Unit test: `normalizeLayoutOptions()` includes `sizing` with correct defaults (mode:"auto", minSize 60×40, padding 16×10)

### Phase 2 QA: Pre-Layout Sizing Function
```
bun test packages/layout/
```
- Unit tests for `sizeGraphNodes()`:
  - Fixed mode: returns `defaultSize` for all nodes regardless of label
  - Auto mode, short label: node ≥ minSize (60×40)
  - Auto mode, long label: width grows to fit text + padding
  - Auto mode, `\n` in label: produces multiple `labelLines`, height grows
  - Auto mode, `labelWrap: "auto"` with `maxWidth`: wraps text, respects cap
  - Auto mode, `labelWrap: "none"`: single line, ellipsis when exceeding `maxWidth`
  - Per-node `layout.width` override: uses explicit width, auto-computes height
  - Per-node `layout.maxWidth`: wraps/truncates at boundary
  - Clamp: never smaller than `minSize`, never larger than `maxSize` when set
  - Determinism: same input always produces same output

### Phase 3 QA: Variable-Width Layout
```
bun test packages/layout/
bun test packages/renderer-svg/
```
- Layout unit tests:
  - Nodes with different widths in same layer don't overlap
  - Edge routing waypoints land on correct node centers
  - `minimizeCrossings()` still works with variable-width nodes
  - Golden test: existing graph diagrams render with same structure (may differ in exact x/y due to sizing)
- Renderer golden tests updated via `DRAWSPEC_GOLDEN_REFRESH=1 bun test`

### Phase 4 QA: Renderer Integration
```
bun test packages/renderer-svg/
```
- Multi-line label rendering: `<text>` or `<tspan>` elements for each `labelLine`
- Single-line labels unchanged from current behavior
- Edge labels still use `truncateText()` (not auto-sized)
- All 1030+ tests pass after golden fixture regeneration
- `bun run check` clean

### Phase 5 QA: Builders + Docs
```
bun test packages/architecture/
bun test packages/uml-*/
bun run check
```
- Builder methods accept `.layout({ width: 200 })` or `.layout({ labelWrap: "auto" })`
- Architecture and UML diagrams render correctly with auto-sized nodes
- Docs engine builds without errors
- Full `bun run check` passes

## Backward Compatibility

- Phase 1+2+3 can ship with `mode: "auto"` as default
- Existing golden fixtures will need regeneration (nodes will be wider for long labels)
- `mode: "fixed"` available as fallback for exact backward compat
- Tests that assert on exact pixel positions will need updating

## Risks

1. **Theme mismatch**: Layout typography must match renderer font. If user sets different font in theme, layout measurer won't match. Mitigation: pass typography from same config source.
2. **Variable-width layer overlap**: Current layer placement multiplies index × uniform width. Must change to cumulative positioning. Medium effort.
3. **External layout adapters**: dagre/elk/wasm receive sized nodes but may not support variable sizes immediately. They can fall back to `defaultSize`.
4. **Golden test churn**: Every golden fixture with labels longer than ~15 chars will change. Expected.

## Effort Estimate

- Phase 1 (types + measure): ~2-3 hours
- Phase 2 (sizing function): ~3-4 hours  
- Phase 3 (variable-width layout): ~2-3 hours
- Phase 4 (renderer): ~2-3 hours
- Phase 5 (builders + docs): ~2-3 hours
- **Total**: ~12-16 hours
