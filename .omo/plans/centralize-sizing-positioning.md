# Centralize Sizing & Positioning Pipeline

## Board Items

All tasks are draft items on the [DrawSpec Project Board](https://github.com/orgs/drawspec/projects/1).

| Task | Wave | Title | Blocked By |
|------|------|-------|------------|
| 1 | 1 | Extend geometry contract with content layout fields | — |
| 2 | 1 | Centralize self-loop routing in graph-utils | — |
| 3 | 1 | Centralize canvas bounds computation | — |
| 4 | 1 | Add deterministic LayoutError on missing geometry | — |
| 5 | 1b | Integrate shared sizing into dagre adapter | 1, 2, 3 |
| 6 | 1b | Integrate shared sizing into WASM adapter | 1, 2, 3 |
| 7 | 1b | Create shared edge label positioning (sizeEdgeLabels) | 1, 2, 3 |
| 8 | 2 | Remove node label fallbacks from renderer | 1, 4, 5 |
| 9 | 1b | Centralize group label positioning for graph diagrams | 1 |
| 10 | 3 | Remove edge label fallbacks from renderer | 7, 8 |
| 11 | 3 | Remove overlap avoidance from renderer | 7, 8, 9 |
| 12 | 4 | Centralize canvas bounds in layout pipeline | 3, 10, 11 |
| 13 | 2 | Normalize ELK edge labels to shared format | 7 |
| 14 | 4 | Add cross-engine geometry parity tests | 5, 6, 7, 13 |
| 15 | 4b | Regenerate golden SVGs | 10, 11, 12 |
| 16 | 5 | Update Serena memories for centralized pipeline | 14, 15 |

> F1–F4 (Plan Compliance Audit, Code Quality Review, Real Manual QA, Scope Fidelity Check) already exist on the board.

## TL;DR

> **Quick Summary**: Centralize ALL sizing and positioning logic into the layout package. Layout becomes the single source of truth for geometry — node bounds, content layout, edge label positions, self-loop routes, and canvas bounds. Renderer only draws from provided geometry and fails deterministically on missing data.
> 
> **Deliverables**:
> - Complete geometry contract (`PositionedDiagram` carries all geometry)
> - All layout engines (dagre, elk, wasm) use shared sizing
> - Centralized edge label positioning via shared post-layout step
> - Centralized self-loop routing in graph-utils
> - Centralized canvas bounds computation
> - Renderer fallback removal — renderer only draws
> - Golden SVG regeneration with consistent positioning
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Task 1 (geometry contract) → Task 5 (shared sizing) → Task 8 (renderer node fallbacks) → Task 10 (renderer edge fallbacks) → Task 12 (canvas bounds) → Task 15 (golden regen) → Task 16 (docs) → F1-F4

---

## Context

### Original Request
Deep dive into the codebase to find duplications in sizing calculations and positioning logic. Centralize entity/label sizing and positioning so it works consistently across all layout engines (dagre, elk, wasm). Fix positioning issues for edge labels and entity labels.

### Interview Summary
**Key Discussions**:
- User wants full pipeline centralization: layout provides ALL geometry, renderer only draws
- 5 duplication families identified across the codebase
- All 3 existing plans (node-auto-sizing, label-occlusion, layout-perf) are already implemented — this builds on that foundation
- Edge labels should become a layout concern for ALL engines, not just ELK
- Renderer should fail deterministically on missing geometry, not silently fall back
- TDD approach (RED-GREEN-REFACTOR) for each task

**Research Findings**:
- Pre-layout sizing is the standard pattern across diagram frameworks (Dagre, Cytoscape.js, JointJS)
- PlantUML's `StringBounder` interface is the gold standard for multi-engine text measurement consistency
- DrawSpec already has a strong foundation: TextMeasurer, sizeGraphNodes, SizedNode, CHARACTER_WIDTH_FACTORS
- ELK treats edge labels as special nodes during layout — this pattern should be adapted
- Mermaid is actively refactoring to separate layout from rendering, confirming this approach

### Metis Review
**Identified Gaps** (addressed):
- "ALL geometry" undefined → defined explicit contract: node bounds, content layout, edge paths, edge label positions, self-loop routes, canvas bounds
- Renderer failure semantics unclear → renderer must fail deterministically, no silent fallbacks
- Sequence diagram scope → explicitly out of scope (separate pipeline)
- Visual drift expectations → expected and acceptable, fixing known positioning issues
- Bounds contract ambiguity → canvas bounds must include labels, arrowheads, strokes
- ELK label normalization → shared post-layout step normalizes all engine outputs

---

## Work Objectives

### Core Objective
Centralize ALL sizing and positioning logic into the layout package so that layout provides complete geometry and the renderer only draws from supplied data.

### Concrete Deliverables
- Updated `PositionedDiagram` type carrying complete geometry
- `sizeEdgeLabels()` shared post-layout function in `@drawspec/layout`
- `computeSelfLoopWaypoints()` centralized in `@drawspec/layout/src/graph-utils.ts`
- `computeCanvasBounds()` centralized in `@drawspec/layout/src/graph-utils.ts`
- Dagre adapter using shared sizing
- WASM adapter using shared sizing (expanded bridge contract)
- Renderer with zero geometry fallbacks
- Regenerated golden SVGs with consistent positioning

### Definition of Done
- [ ] `bun run check` passes (build + typecheck + lint + test)
- [ ] All layout engines produce identical geometry for same input
- [ ] Renderer has zero fallback positioning code
- [ ] Renderer fails deterministically on missing geometry
- [ ] All golden SVGs regenerated and reviewed
- [ ] No self-loop routing code outside graph-utils
- [ ] No canvas bounds code outside graph-utils

### Must Have
- Complete geometry contract (PositionedDiagram carries all geometry)
- All engines (dagre, elk, wasm) use shared node sizing
- Edge label positions computed by layout for ALL engines
- Self-loop routing centralized to graph-utils
- Canvas bounds centralized to graph-utils
- Renderer fallback removal
- TDD: failing test first for each new piece of geometry
- Deterministic output across all engines for same input

### Must NOT Have (Guardrails)
- No visual redesign or style/theme changes
- No new layout algorithms
- No changes to sequence diagram layout pipeline
- No exporter changes (mermaid, plantuml, d2)
- No preview app changes
- No performance optimization beyond preserving current behavior
- No reimplementation of completed plans (node-auto-sizing, label-occlusion, layout-perf)
- No silent renderer fallbacks when geometry is missing
- No `Math.random()`, `Date.now()`, DOM measurement, or environment-dependent behavior
- No package dependency cycles

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (TDD)
- **Framework**: bun test
- **TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Layout package**: Use Bash (bun test) — assert geometry output
- **Renderer**: Use Bash (bun test + golden comparison) — assert SVG output
- **Cross-engine**: Use Bash (bun test) — assert identical geometry from different engines
- **Integration**: Use Bash (bun run check) — full pipeline validation

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - contracts + shared helpers):
├── Task 1: Define complete geometry contract [quick]
├── Task 2: Centralize self-loop routing to graph-utils [quick]
├── Task 3: Centralize canvas bounds computation to graph-utils [quick]
└── Task 4: Add deterministic renderer error on missing geometry [quick]

Wave 1b (After Wave 1 complete - adapters, edge labels, group labels):
├── Task 5: Integrate shared sizing into dagre adapter [unspecified-high]
├── Task 6: Integrate shared sizing into WASM adapter [deep]
├── Task 7: Create shared edge label positioning (depends: 1, 2, 3) [deep]
└── Task 9: Centralize group label positioning for graph diagrams [unspecified-high]

Wave 2 (After Wave 1b - renderer cleanup + ELK normalization):
├── Task 8: Remove node label fallbacks from renderer (depends: 1, 4, 5) [unspecified-high]
└── Task 13: Update ELK adapter to use shared edge label positioning (depends: 7) [quick]

Wave 3 (After Wave 2 - renderer cleanup):
├── Task 10: Remove edge label fallbacks from renderer (depends: 7, 8) [unspecified-high]
└── Task 11: Remove overlap avoidance from renderer (depends: 7, 8, 9) [unspecified-high]

Wave 4 (After Wave 3 - integration):
├── Task 12: Move autoFit bounds to include labels (depends: 3, 10, 11) [quick]
└── Task 14: Cross-engine geometry parity tests (depends: 5, 6, 7, 13) [deep]

Wave 4b (After Task 12 - golden regeneration):
└── Task 15: Regenerate golden SVGs (depends: 10, 11, 12) [unspecified-high]

Wave 5 (After Wave 4 - documentation):
└── Task 16: Update Serena memories and documentation (depends: 14, 15) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 5 → Task 8 → Task 10 → Task 12 → Task 15 → Task 16 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 4 (Wave 1) + 4 (Wave 1b)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 5, 6, 7, 8, 9 |
| 2 | - | 7, 13 |
| 3 | - | 7, 12 |
| 4 | - | 8, 10, 11 |
| 5 | 1, 2, 3 | 8, 14 |
| 6 | 1, 2, 3 | 14 |
| 7 | 1, 2, 3 | 10, 11, 13, 14 |
| 8 | 1, 4, 5 | 10, 11 |
| 9 | 1 | 11 |
| 10 | 7, 8 | 12, 15 |
| 11 | 7, 8, 9 | 12, 15 |
| 12 | 3, 10, 11 | 15 |
| 13 | 7 | 14 |
| 14 | 5, 6, 7, 13 | 16 |
| 15 | 10, 11, 12 | 16 |
| 16 | 14, 15 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1 `quick`, T2 `quick`, T3 `quick`, T4 `quick`
- **Wave 1b**: 4 tasks — T5 `unspecified-high`, T6 `deep`, T7 `deep`, T9 `unspecified-high`
- **Wave 2**: 2 tasks — T8 `unspecified-high`, T13 `quick`
- **Wave 3**: 2 tasks — T10 `unspecified-high`, T11 `unspecified-high`
- **Wave 4**: 2 tasks — T12 `quick`, T14 `deep`
- **Wave 4b**: 1 task — T15 `unspecified-high`
- **Wave 5**: 1 task — T16 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Define Complete Geometry Contract

  **What to do**:
  - RED: Write failing test that asserts `PositionedDiagram` carries complete geometry: node bounds + contentLayout + labelLines, edge labelPosition + labelLines, self-loop waypoints, canvas bounds including labels
  - GREEN: Update `PositionedNode`, `PositionedEdge`, `PositionedGroup` types in `packages/layout/src/types.ts` to make geometry fields required (not optional). Add `labelLines: string[]` and `labelPosition: { x: number; y: number }` as required on `PositionedEdge`. Ensure `NodeContentLayout` is required on `PositionedNode`. Add `canvasBounds: Bounds` to `PositionedDiagram`.
  - REFACTOR: Clean up any type assertions that relied on optional geometry

  **Must NOT do**:
  - Change any rendering behavior yet — only types and tests
  - Modify sequence layout types
  - Break existing golden tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5, 6, 7, 8, 9
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/layout/src/types.ts` — current PositionedNode, PositionedEdge, PositionedGroup types. Note which fields are currently optional vs required
  - `packages/layout/src/sizing.ts:80-210` — existing NodeContentLayout structure that should become the required contract
  - `packages/renderer-svg/src/renderer.ts:497-556` — renderer's fallback code that checks for missing contentLayout, showing what the renderer currently expects
  - `packages/layout-elk/src/elk.ts:190-206` — how ELK currently provides edge labelPosition (the model to follow)

  **Acceptance Criteria**:
  - [ ] Test file created: `packages/layout/src/__tests__/geometry-contract.test.ts`
  - [ ] `bun test packages/layout/src/__tests__/geometry-contract.test.ts` → PASS
  - [ ] All PositionedNode/Edge/Group geometry fields are required (not optional)
  - [ ] `bun run build` passes with updated types

  **QA Scenarios**:

  ```
  Scenario: PositionedNode requires contentLayout
    Tool: Bash (bun test)
    Preconditions: New test file exists
    Steps:
      1. Create a PositionedNode without contentLayout
      2. Assert TypeScript compilation error
      3. Create a PositionedNode with full contentLayout
      4. Assert TypeScript compilation succeeds
    Expected Result: Type system enforces complete geometry
    Evidence: .omo/evidence/task-1-type-contract.txt

  Scenario: PositionedEdge requires labelPosition
    Tool: Bash (bun test)
    Preconditions: New test file exists
    Steps:
      1. Create a PositionedEdge without labelPosition
      2. Assert TypeScript error
    Expected Result: Edge geometry is required
    Evidence: .omo/evidence/task-1-edge-contract.txt
  ```

  **Commit**: YES
  - Message: `refactor(layout): define complete geometry contract for positioned diagrams`
  - Files: `packages/layout/src/types.ts`, `packages/layout/src/__tests__/geometry-contract.test.ts`

- [x] 2. Centralize Self-Loop Routing to graph-utils

  **What to do**:
  - RED: Write failing test that asserts a single `computeSelfLoopWaypoints()` function produces identical output to the 4+ duplicated self-loop implementations
  - GREEN: Extract a single `computeSelfLoopWaypoints(node, offset?)` function in `packages/layout/src/graph-utils.ts`. The 28px offset is the canonical value. Update `graph.ts` to use it.
  - REFACTOR: Clean up the duplicated self-loop code in graph.ts

  **Must NOT do**:
  - Update dagre/elk/wasm adapters yet (those come in later tasks)
  - Change the visual output of self-loops

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 13
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/layout/src/graph-utils.ts:5-34` — existing shared center/bounds helpers, where the new function should live
  - `packages/layout/src/graph.ts:373-465` — the richest self-loop implementation to use as the canonical version
  - `packages/layout-dagre/src/dagre.ts:117-150` — near-identical self-loop with 28px offset (duplication source)
  - `packages/layout-elk/src/elk.ts:148-187` — same pattern (duplication source)
  - `packages/layout-wasm/src/wasm-layout.ts:64-105` — same pattern (duplication source)

  **Acceptance Criteria**:
  - [ ] `computeSelfLoopWaypoints()` exists in graph-utils.ts
  - [ ] `bun test packages/layout/src/__tests__/graph-utils.test.ts` → PASS
  - [ ] `graph.ts` uses the centralized function instead of inline self-loop code

  **QA Scenarios**:

  ```
  Scenario: Centralized self-loop matches current output
    Tool: Bash (bun test)
    Preconditions: Existing graph layout tests pass
    Steps:
      1. Run existing self-loop test cases through new computeSelfLoopWaypoints()
      2. Assert waypoint arrays match previous inline implementations exactly
    Expected Result: Byte-for-byte identical waypoint output
    Evidence: .omo/evidence/task-2-self-loop-parity.txt

  Scenario: Self-loop with custom offset
    Tool: Bash (bun test)
    Steps:
      1. Call computeSelfLoopWaypoints(node, 40)
      2. Assert loop is proportionally larger
    Expected Result: Offset parameter scales the loop correctly
    Evidence: .omo/evidence/task-2-self-loop-custom.txt
  ```

  **Commit**: YES
  - Message: `refactor(layout): centralize self-loop routing to graph-utils`
  - Files: `packages/layout/src/graph-utils.ts`, `packages/layout/src/graph.ts`

- [x] 3. Centralize Canvas Bounds Computation to graph-utils

  **What to do**:
  - RED: Write failing test asserting `computeCanvasBounds()` produces correct bounds from positioned nodes + edges + labels
  - GREEN: Extract a single `computeCanvasBounds(positionedDiagram, padding)` function in graph-utils.ts that includes all geometry: nodes, edges, labels, arrowheads. Update `graph.ts` to use it.
  - REFACTOR: Remove inline bounds computation from graph.ts

  **Must NOT do**:
  - Update dagre/elk/wasm adapters yet
  - Change autoFit in renderer yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 12
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/layout/src/graph-utils.ts:37-54` — existing bounds helper to extend
  - `packages/layout-dagre/src/dagre.ts:153-176, 185-193` — `Math.max(padding * 2, ...)+padding` pattern
  - `packages/layout-elk/src/elk.ts:209-236, 245-253` — same pattern with label extents
  - `packages/layout-wasm/src/wasm-layout.ts:108-131, 141-149` — same pattern
  - `packages/renderer-svg/src/renderer.ts:208-246` — current autoFit that doesn't include labels

  **Acceptance Criteria**:
  - [ ] `computeCanvasBounds()` exists in graph-utils.ts
  - [ ] `bun test packages/layout/src/__tests__/graph-utils.test.ts` → PASS
  - [ ] Function includes label extents in bounds calculation

  **QA Scenarios**:

  ```
  Scenario: Bounds include all geometry
    Tool: Bash (bun test)
    Steps:
      1. Create positioned diagram with nodes at edges of canvas
      2. Add edge labels that extend beyond node bounds
      3. Compute bounds
      4. Assert labels are within bounds
    Expected Result: Bounds encompass all content including labels
    Evidence: .omo/evidence/task-3-bounds-labels.txt

  Scenario: Bounds with padding
    Tool: Bash (bun test)
    Steps:
      1. Create minimal diagram (1 node)
      2. Compute bounds with padding=20
      3. Assert bounds.width >= 40 and bounds.height >= 40
    Expected Result: Minimum bounds respect padding
    Evidence: .omo/evidence/task-3-bounds-padding.txt
  ```

  **Commit**: YES
  - Message: `refactor(layout): centralize canvas bounds computation to graph-utils`
  - Files: `packages/layout/src/graph-utils.ts`, `packages/layout/src/graph.ts`

- [x] 4. Add Deterministic Renderer Error on Missing Geometry

  **What to do**:
  - RED: Write failing test that renders a diagram with missing contentLayout — assert it throws/produces diagnostic instead of silently falling back
  - GREEN: Add explicit guard in `renderer.ts` `renderNode()` that throws a `LayoutError` when `contentLayout` is missing. Add guard in `renderEdge()` when `labelPosition` is missing for edges with labels. Replace fallback code paths with these guards.
  - REFACTOR: Remove the fallback label placement code from renderNode and renderEdge

  **Must NOT do**:
  - Remove overlap avoidance yet (Task 11)
  - Change any layout engine behavior
  - Break existing tests that use properly positioned diagrams

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 8, 10, 11
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/renderer-svg/src/renderer.ts:497-556` — current renderNode with fallback when contentLayout is missing
  - `packages/renderer-svg/src/renderer.ts:1553-1720` — current renderEdge with midpoint fallback
  - `packages/core/src/types.ts` — `Diagnostic` type for error reporting
  - `packages/renderer-svg/src/__tests__/renderer.test.ts` — existing test patterns

  **Acceptance Criteria**:
  - [ ] `LayoutError` or diagnostic thrown when contentLayout missing
  - [ ] `LayoutError` or diagnostic thrown when labelPosition missing on labeled edge
  - [ ] `bun test packages/renderer-svg/` → PASS (existing tests still work since they use proper layout output)

  **QA Scenarios**:

  ```
  Scenario: Missing contentLayout produces error
    Tool: Bash (bun test)
    Steps:
      1. Create a PositionedNode without contentLayout
      2. Call renderSvgSync()
      3. Assert it throws LayoutError with message containing "contentLayout"
    Expected Result: Deterministic error, not silent fallback
    Evidence: .omo/evidence/task-4-missing-content-layout.txt

  Scenario: Missing labelPosition on labeled edge produces error
    Tool: Bash (bun test)
    Steps:
      1. Create a PositionedEdge with label but no labelPosition
      2. Call renderSvgSync()
      3. Assert it throws LayoutError
    Expected Result: Deterministic error
    Evidence: .omo/evidence/task-4-missing-edge-label.txt
  ```

  **Commit**: YES
  - Message: `refactor(renderer-svg): add deterministic error on missing geometry`
  - Files: `packages/renderer-svg/src/renderer.ts`, `packages/renderer-svg/src/__tests__/renderer.test.ts`

- [x] 5. Integrate Shared Sizing into Dagre Adapter

  **What to do**:
  - RED: Write failing test asserting dagre adapter uses `sizeGraphNodes()` instead of default 120×56 for all nodes
  - GREEN: Update `packages/layout-dagre/src/dagre.ts` to call `sizeGraphNodes()` from `@drawspec/layout` before passing nodes to dagre. Pass measured dimensions to dagre's `setNode()`. Use `computeSelfLoopWaypoints()` and `computeCanvasBounds()` from graph-utils.
  - REFACTOR: Remove inline self-loop routing and bounds computation from dagre adapter

  **Must NOT do**:
  - Change dagre's routing algorithm
  - Add edge label support yet (Task 7)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 9 in Wave 1b)
  - **Parallel Group**: Wave 1b (after Wave 1 complete)
  - **Blocks**: Tasks 8, 14
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `packages/layout-dagre/src/dagre.ts` — full adapter, currently uses default width/height
  - `packages/layout/src/sizing.ts:73-210` — `sizeGraphNodes()` function to integrate
  - `packages/layout/src/measure.ts` — `createTextMeasurer()` to use for consistent measurement
  - `packages/layout/src/options.ts:20-64` — `normalizeLayoutOptions()` for sizing configuration
  - `packages/layout/src/graph-utils.ts` — centralized self-loop and bounds helpers (from Tasks 2, 3)

  **Acceptance Criteria**:
  - [ ] Dagre adapter calls `sizeGraphNodes()` before layout
  - [ ] Dagre nodes have measured dimensions (not fixed 120×56)
  - [ ] `bun test packages/layout-dagre/` → PASS
  - [ ] `bun test packages/renderer-svg/` → PASS (renderer still gets valid data)

  **QA Scenarios**:

  ```
  Scenario: Dagre nodes sized to fit labels
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with node labeled "Very Long Label Name Here"
      2. Layout with dagre engine
      3. Assert output node width > 120 (default size)
    Expected Result: Node width measured from label text
    Evidence: .omo/evidence/task-5-dagre-sizing.txt

  Scenario: Dagre sizing matches built-in graph engine
    Tool: Bash (bun test)
    Steps:
      1. Create same diagram
      2. Layout with dagre engine
      3. Layout with built-in graph engine
      4. Compare node dimensions — assert identical measured sizes
    Expected Result: Same node dimensions across engines
    Evidence: .omo/evidence/task-5-dagre-parity.txt
  ```

  **Commit**: YES
  - Message: `refactor(layout-dagre): integrate shared node sizing`
  - Files: `packages/layout-dagre/src/dagre.ts`, `packages/layout-dagre/src/__tests__/dagre.test.ts`

- [x] 6. Integrate Shared Sizing into WASM Adapter

  **What to do**:
  - RED: Write failing test asserting WASM adapter uses `sizeGraphNodes()` and returns full geometry
  - GREEN: Update `packages/layout-wasm/src/wasm-layout.ts` to call `sizeGraphNodes()` before bridge serialization. Expand `wasm-bridge.ts` input contract to carry measured dimensions. Update `fallback.ts` to use shared `computeSelfLoopWaypoints()` and `computeCanvasBounds()`. After bridge execution, merge sized data back into output.
  - REFACTOR: Remove duplicated routing and bounds code from wasm-layout.ts and fallback.ts

  **Must NOT do**:
  - Change the WASM binary itself — only the TypeScript adapter layer
  - Add edge label support yet (Task 7)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 9 in Wave 1b)
  - **Parallel Group**: Wave 1b (after Wave 1 complete)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `packages/layout-wasm/src/wasm-layout.ts` — main WASM adapter
  - `packages/layout-wasm/src/wasm-bridge.ts:26-45` — bridge contract (currently too narrow)
  - `packages/layout-wasm/src/fallback.ts:63-138, 174-227, 231-257` — duplicated routing and bounds
  - `packages/layout/src/sizing.ts:73-210` — sizeGraphNodes() to integrate
  - `packages/layout/src/graph-utils.ts` — centralized helpers from Tasks 2, 3

  **Acceptance Criteria**:
  - [ ] WASM adapter calls `sizeGraphNodes()` before layout
  - [ ] WASM nodes have measured dimensions in output
  - [ ] `bun test packages/layout-wasm/` → PASS
  - [ ] Bridge contract carries measured dimensions

  **QA Scenarios**:

  ```
  Scenario: WASM nodes sized to fit labels
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with long-label node
      2. Layout with WASM engine
      3. Assert output node width > 120
    Expected Result: WASM uses shared sizing
    Evidence: .omo/evidence/task-6-wasm-sizing.txt

  Scenario: WASM fallback uses shared helpers
    Tool: Bash (bun test)
    Steps:
      1. Force fallback path (no WASM binary)
      2. Assert self-loop waypoints come from graph-utils
      3. Assert canvas bounds come from graph-utils
    Expected Result: Fallback path uses centralized code
    Evidence: .omo/evidence/task-6-wasm-fallback.txt
  ```

  **Commit**: YES
  - Message: `refactor(layout-wasm): integrate shared node sizing and expand bridge`
  - Files: `packages/layout-wasm/src/wasm-layout.ts`, `packages/layout-wasm/src/wasm-bridge.ts`, `packages/layout-wasm/src/fallback.ts`

- [x] 7. Create Shared Edge Label Positioning

  **What to do**:
  - RED: Write failing test asserting `sizeEdgeLabels()` computes label positions for all edges from waypoints, producing identical output regardless of engine
  - GREEN: Create `packages/layout/src/edge-labels.ts` with `sizeEdgeLabels(edges, options)`. For each edge with a label: compute midpoint from waypoints, measure label text, compute `labelPosition` and `labelLines`. Handle rotation from edge angle. Use `TextMeasurer` for consistent measurement. Apply to all engines as a post-layout step.
  - REFACTOR: Extract the midpoint heuristic from renderer into this shared function

  **Must NOT do**:
  - Change edge label visual appearance
  - Include overlap avoidance yet (Task 11)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 9 in Wave 1b)
  - **Parallel Group**: Wave 1b (after Wave 1 complete)
  - **Blocks**: Tasks 10, 11, 13, 14
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `packages/renderer-svg/src/renderer.ts:1723-2001` — current edge label positioning logic (midpoint, edgeAngleAtPoint, rotation). This is the PRIMARY source to extract
  - `packages/renderer-svg/src/renderer.ts:1592-1666` — edge label overlap handling to understand but not extract
  - `packages/layout-elk/src/elk.ts:77-85, 190-206` — how ELK currently provides labelPosition. Should be replaced by shared function
  - `packages/layout/src/measure.ts` — TextMeasurer for consistent measurement
  - `packages/layout/src/options.ts:24-61` — layout defaults including typography for edge labels

  **Acceptance Criteria**:
  - [ ] `sizeEdgeLabels()` exists in `packages/layout/src/edge-labels.ts`
  - [ ] `bun test packages/layout/src/__tests__/edge-labels.test.ts` → PASS
  - [ ] Function handles: midpoint, rotation, text wrapping, background sizing
  - [ ] Same input produces identical output regardless of calling engine

  **QA Scenarios**:

  ```
  Scenario: Edge label at midpoint of straight edge
    Tool: Bash (bun test)
    Steps:
      1. Create edge with 2 waypoints: (0,0) and (200,0)
      2. Call sizeEdgeLabels()
      3. Assert labelPosition.x ≈ 100 and labelPosition.y ≈ 0
    Expected Result: Label centered on midpoint
    Evidence: .omo/evidence/task-7-straight-edge.txt

  Scenario: Edge label rotated with edge angle
    Tool: Bash (bun test)
    Steps:
      1. Create diagonal edge with waypoints: (0,0) and (100,100)
      2. Call sizeEdgeLabels()
      3. Assert rotation ≈ 45 degrees
    Expected Result: Label rotation matches edge slope
    Evidence: .omo/evidence/task-7-rotated-edge.txt

  Scenario: Multi-segment edge label at path midpoint
    Tool: Bash (bun test)
    Steps:
      1. Create edge with 4 waypoints forming an L-shape
      2. Call sizeEdgeLabels()
      3. Assert label is at the path's geometric midpoint (half total path length)
    Expected Result: Label at path midpoint, matching current renderer behavior
    Evidence: .omo/evidence/task-7-multi-segment.txt
  ```

  **Commit**: YES
  - Message: `feat(layout): add shared edge label positioning`
  - Files: `packages/layout/src/edge-labels.ts`, `packages/layout/src/__tests__/edge-labels.test.ts`, `packages/layout/src/index.ts`

- [x] 8. Remove Node Label Fallbacks from Renderer

  **What to do**:
  - RED: Write failing test asserting renderer does NOT compute label positions for nodes — it only uses contentLayout from layout output
  - GREEN: Remove the fallback code in `renderer.ts` `renderNode()` that computes centered node-label placement when `contentLayout` is missing. The guard from Task 4 now catches this. Remove `truncateText()` for node labels (layout provides `labelLines`). Remove interface-specific label offset code (move to layout sizing).
  - REFACTOR: Simplify renderNode to just consume contentLayout

  **Must NOT do**:
  - Remove edge label fallbacks yet (Task 10)
  - Remove overlap avoidance yet (Task 11)
  - Change layout engine output

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 1, 4, 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 10, 11
  - **Blocked By**: Tasks 1, 4, 5

  **References**:
  - `packages/renderer-svg/src/renderer.ts:497-618` — renderNode with all fallback code to remove
  - `packages/renderer-svg/src/renderer.ts:533-555` — node label offset/line-height heuristics to remove
  - `packages/renderer-svg/src/renderer.ts:1189-1516` — icon rendering with baked offsets
  - `packages/renderer-svg/src/renderer.ts:2049-2211` — textElement that currently handles truncation

  **Acceptance Criteria**:
  - [ ] renderNode() has zero fallback label positioning code
  - [ ] renderNode() only uses contentLayout from layout output
  - [ ] `bun test packages/renderer-svg/` → PASS (all tests use proper layout output)
  - [ ] No `truncateText()` calls for node labels

  **QA Scenarios**:

  ```
  Scenario: Renderer uses contentLayout for node labels
    Tool: Bash (bun test)
    Steps:
      1. Create positioned node with full contentLayout
      2. Render to SVG
      3. Assert label appears at contentLayout-specified position
    Expected Result: Label position matches layout output exactly
    Evidence: .omo/evidence/task-8-node-content-layout.txt

  Scenario: No fallback code paths remain
    Tool: Bash (grep)
    Steps:
      1. Grep renderer.ts for "truncateText" in node rendering code
      2. Grep for centered label fallback pattern
      3. Assert zero matches in renderNode path
    Expected Result: Zero fallback code paths
    Evidence: .omo/evidence/task-8-no-fallbacks.txt
  ```

  **Commit**: YES
  - Message: `refactor(renderer-svg): remove node label fallbacks`
  - Files: `packages/renderer-svg/src/renderer.ts`, `packages/renderer-svg/src/__tests__/renderer.test.ts`

- [x] 9. Centralize Group Label Positioning in Layout

  **What to do**:
  - RED: Write failing test asserting `PositionedGroup` carries complete label geometry (labelLines, labelPosition) for graph diagrams
  - GREEN: Update `packages/layout/src/graph.ts` to provide labelLines and labelPosition for all groups in graph diagrams. Ensure groups carry their label geometry in the PositionedDiagram output. Remove renderer fallback for group label wrapping in graph rendering path.
  - REFACTOR: Clean up group label wrapping in renderer's graph rendering path only

  **Must NOT do**:
  - Touch `packages/layout/src/sequence.ts` (sequence diagrams are out of scope)
  - Change sequence diagram visual output
  - Change group label appearance

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (only depends on Task 1, can run alongside Tasks 5, 6 in Wave 1b)
  - **Parallel Group**: Wave 1b (after Wave 1 complete)
  - **Blocks**: Task 11
  - **Blocked By**: Task 1

  **References**:
  - `packages/layout/src/graph.ts` — graph layout where group label positioning should be added
  - `packages/renderer-svg/src/renderer.ts:401-495` — renderGroup with fallback label wrapping at lines 433-444
  - `packages/renderer-svg/src/renderer.ts:470-482` — lane label offsets to centralize
  - `packages/layout/src/sizing.ts:441-647` — compartment/label sizing to use as reference

  **Acceptance Criteria**:
  - [ ] `PositionedGroup.labelLines` is required for graph diagrams (not optional)
  - [ ] `PositionedGroup.labelPosition` is provided for graph diagrams
  - [ ] `bun test packages/layout/` → PASS
  - [ ] Renderer no longer wraps group labels for graph diagrams

  **QA Scenarios**:

  ```
  Scenario: Group label geometry in graph layout output
    Tool: Bash (bun test)
    Steps:
      1. Create graph diagram with group containing label "Service Layer"
      2. Layout with graph engine
      3. Assert group.labelLines is populated
      4. Assert group.labelPosition exists
    Expected Result: Group labels positioned by layout
    Evidence: .omo/evidence/task-9-group-labels.txt

  Scenario: Renderer uses layout-provided group labels
    Tool: Bash (bun test)
    Steps:
      1. Render diagram from previous scenario
      2. Assert group label appears at layout-specified position
    Expected Result: No renderer-side group label computation
    Evidence: .omo/evidence/task-9-group-render.txt
  ```

  **Commit**: YES
  - Message: `refactor(layout): centralize group label positioning for graph diagrams`
  - Files: `packages/layout/src/graph.ts`, `packages/renderer-svg/src/renderer.ts`

- [x] 10. Remove Edge Label Fallbacks from Renderer

  **What to do**:
  - RED: Write failing test asserting renderer does NOT compute edge label midpoint — it only uses labelPosition from layout
  - GREEN: Remove the midpoint heuristic, edgeAngleAtPoint computation, and edge label wrap logic from `renderer.ts` `renderEdge()`. The renderer now only reads `edge.labelPosition` and `edge.labelLines` from layout output. Remove `edgeYInXRange()` and related overlap shifting code.
  - REFACTOR: Simplify renderEdge label rendering to consume layout output only

  **Must NOT do**:
  - Remove overlap avoidance yet (Task 11)
  - Change edge path rendering (waypoints still used)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 7, 8)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 12, 15
  - **Blocked By**: Tasks 7, 8

  **References**:
  - `packages/renderer-svg/src/renderer.ts:1553-1720` — current renderEdge with midpoint fallback to remove
  - `packages/renderer-svg/src/renderer.ts:1723-2001` — geometry helpers (midpoint, edgeAngleAtPoint, edgeYInXRange) to remove
  - `packages/layout/src/edge-labels.ts` — new shared function that now provides all edge label geometry
  - `packages/renderer-svg/src/renderer.ts:2049-2211` — textElement for edge labels

  **Acceptance Criteria**:
  - [ ] renderEdge() has zero midpoint computation code
  - [ ] renderEdge() only uses edge.labelPosition and edge.labelLines
  - [ ] `bun test packages/renderer-svg/` → PASS
  - [ ] `midpoint()` and `edgeAngleAtPoint()` functions removed from renderer

  **QA Scenarios**:

  ```
  Scenario: Renderer uses layout-provided edge label positions
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with labeled edge
      2. Layout with any engine (all now provide labelPosition)
      3. Render to SVG
      4. Assert label appears at layout-specified position
    Expected Result: Edge label position from layout, not renderer
    Evidence: .omo/evidence/task-10-edge-labels.txt

  Scenario: No edge label geometry computation in renderer
    Tool: Bash (grep)
    Steps:
      1. Grep renderer.ts for "midpoint(" 
      2. Grep for "edgeAngleAtPoint("
      3. Assert zero matches
    Expected Result: Zero geometry functions in renderer
    Evidence: .omo/evidence/task-10-no-edge-geometry.txt
  ```

  **Commit**: YES
  - Message: `refactor(renderer-svg): remove edge label fallbacks`
  - Files: `packages/renderer-svg/src/renderer.ts`, `packages/renderer-svg/src/__tests__/renderer.test.ts`

- [x] 11. Remove Overlap Avoidance from Renderer

  **What to do**:
  - RED: Write failing test asserting label overlap avoidance has moved to layout (renderer no longer shifts labels)
  - GREEN: Move `avoidLabelOverlaps()` from renderer to layout package as a shared post-layout step. Call it after all engines complete their positioning. Update all engines to run this step. Remove `avoidLabelOverlaps()` from renderer's `renderSvgSync()` post-pass. Remove `computePaddedBounds()` from renderer.
  - REFACTOR: Renderer's renderSvgSync no longer has a label post-processing pass

  **Must NOT do**:
  - Change the overlap avoidance algorithm — just move it
  - Remove label collection from renderer (it still needs to collect labels for SVG output)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 7, 8, 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 12, 15
  - **Blocked By**: Tasks 7, 8, 9

  **References**:
  - `packages/renderer-svg/src/renderer.ts:2222-2288` — `avoidLabelOverlaps()` to move to layout
  - `packages/renderer-svg/src/renderer.ts:2291-2342` — `computePaddedBounds()` / clamp to group bounds to move
  - `packages/renderer-svg/src/renderer.ts:116-205` — renderSvgSync post-pass that calls avoidLabelOverlaps
  - `packages/layout/src/graph-utils.ts` — where the moved function should live
  - `packages/renderer-svg/src/renderer.ts:1601-1650` — edge-label overlap heuristic to also move

  **Acceptance Criteria**:
  - [ ] `avoidLabelOverlaps()` lives in `packages/layout/src/graph-utils.ts`
  - [ ] All engines call overlap avoidance as post-layout step
  - [ ] Renderer has no label position adjustment code
  - [ ] `bun test packages/layout/ packages/renderer-svg/` → PASS

  **QA Scenarios**:

  ```
  Scenario: Overlap avoidance in layout output
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with overlapping labels
      2. Layout with any engine
      3. Assert labels are adjusted (no overlaps) in layout output
    Expected Result: Overlap avoidance happens before renderer
    Evidence: .omo/evidence/task-11-layout-overlap.txt

  Scenario: No label adjustment in renderer
    Tool: Bash (grep)
    Steps:
      1. Grep renderer.ts for "avoidLabelOverlaps"
      2. Grep for "computePaddedBounds"
      3. Assert zero matches
    Expected Result: Zero overlap code in renderer
    Evidence: .omo/evidence/task-11-no-renderer-overlap.txt
  ```

  **Commit**: YES
  - Message: `refactor(renderer-svg): remove overlap avoidance from renderer`
  - Files: `packages/renderer-svg/src/renderer.ts`, `packages/layout/src/graph-utils.ts`, `packages/renderer-svg/src/__tests__/renderer.test.ts`

- [x] 12. Move AutoFit Bounds to Include Labels

  **What to do**:
  - RED: Write failing test asserting autoFit bounds include all labels
  - GREEN: Update `renderer.ts` `computeContentBounds()` to use `positionedDiagram.canvasBounds` from layout output instead of computing its own bounds. Remove the node/edge-only bounds computation. Canvas bounds now include labels, arrowheads, and all geometry.
  - REFACTOR: Simplify autoFit to use layout-provided bounds

  **Must NOT do**:
  - Change how autoFit is triggered or configured
  - Change padding/margin behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 3, 10, 11)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 3, 10, 11

  **References**:
  - `packages/renderer-svg/src/renderer.ts:208-246` — current computeContentBounds that misses labels
  - `packages/layout/src/graph-utils.ts` — `computeCanvasBounds()` from Task 3 that includes labels
  - `packages/renderer-svg/src/renderer.ts:116-205` — renderSvgSync that uses computeContentBounds for autoFit

  **Acceptance Criteria**:
  - [ ] autoFit uses `positionedDiagram.canvasBounds` from layout
  - [ ] Labels at diagram edges are fully visible
  - [ ] `bun test packages/renderer-svg/` → PASS

  **QA Scenarios**:

  ```
  Scenario: AutoFit includes edge labels
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with edge labels at boundary
      2. Render with autoFit
      3. Assert viewBox encompasses all edge label text
    Expected Result: No clipped labels
    Evidence: .omo/evidence/task-12-autofit-labels.txt

  Scenario: AutoFit uses layout-provided bounds
    Tool: Bash (bun test)
    Steps:
      1. Create diagram
      2. Layout → get canvasBounds
      3. Render → get autoFit viewBox
      4. Assert viewBox matches canvasBounds
    Expected Result: Renderer uses layout bounds directly
    Evidence: .omo/evidence/task-12-bounds-match.txt
  ```

  **Commit**: YES
  - Message: `fix(renderer-svg): include labels in autoFit bounds`
  - Files: `packages/renderer-svg/src/renderer.ts`

- [x] 13. Update ELK Adapter to Use Shared Edge Label Positioning

  **What to do**:
  - RED: Write failing test asserting ELK adapter uses shared `sizeEdgeLabels()` instead of ELK-native label positions
  - GREEN: Update `packages/layout-elk/src/elk.ts` to call `sizeEdgeLabels()` from layout as a post-step. This normalizes ELK output to match dagre/wasm. Remove ELK-specific edge label extraction code.
  - REFACTOR: Remove inline edge label measurement from ELK adapter

  **Must NOT do**:
  - Change ELK layout algorithm usage
  - Remove ELK-specific node positioning (that stays)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8)
  - **Parallel Group**: Wave 2 (after Wave 1b)
  - **Blocks**: Task 14
  - **Blocked By**: Task 7

  **References**:
  - `packages/layout-elk/src/elk.ts:77-85, 190-206, 227-229` — current ELK-specific edge label handling
  - `packages/layout/src/edge-labels.ts` — shared `sizeEdgeLabels()` to use instead
  - `packages/layout-elk/src/__tests__/elk.test.ts:111-133` — existing ELK label position tests

  **Acceptance Criteria**:
  - [ ] ELK adapter calls `sizeEdgeLabels()` as post-step
  - [ ] ELK edge label positions match dagre/wasm for same input
  - [ ] `bun test packages/layout-elk/` → PASS

  **QA Scenarios**:

  ```
  Scenario: ELK edge labels match shared positioning
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with labeled edge
      2. Layout with ELK
      3. Layout with dagre
      4. Assert edge.labelPosition is identical
    Expected Result: Same edge label position from both engines
    Evidence: .omo/evidence/task-13-elk-edge-parity.txt
  ```

  **Commit**: YES
  - Message: `refactor(layout-elk): use shared edge label positioning`
  - Files: `packages/layout-elk/src/elk.ts`, `packages/layout-elk/src/__tests__/elk.test.ts`

- [x] 14. Cross-Engine Geometry Parity Tests

  **What to do**:
  - RED: Write failing parity test suite asserting all engines produce identical sizing and positioning for same input
  - GREEN: Create comprehensive parity tests in `packages/layout/src/__tests__/engine-parity.test.ts` that run same diagrams through all engines (dagre, elk, wasm, built-in) and assert: node dimensions match, edge label positions match, self-loop routes match, canvas bounds match.
  - REFACTOR: Identify any remaining inconsistencies and fix them

  **Must NOT do**:
  - Assert identical node POSITIONS across engines (different algorithms place nodes differently — only SIZING and LABEL POSITIONING must match)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 5, 6, 7, 13)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 5, 6, 7, 13

  **References**:
  - All layout engine test files for test patterns
  - `packages/testkit/` — existing test helpers for diagram creation
  - `packages/layout/src/sizing.ts` — shared sizing functions being tested
  - `packages/layout/src/edge-labels.ts` — shared edge label functions being tested

  **Acceptance Criteria**:
  - [ ] Parity test file exists and passes
  - [ ] Tests cover: node sizing, edge label position, self-loop routes, canvas bounds
  - [ ] All engines produce identical sizing for same input
  - [ ] `bun test packages/layout/src/__tests__/engine-parity.test.ts` → PASS

  **QA Scenarios**:

  ```
  Scenario: Node sizing parity across all engines
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with various label lengths
      2. Layout with dagre, elk, wasm, built-in
      3. Compare node widths and heights across all engines
      4. Assert all identical
    Expected Result: Same node dimensions from all engines
    Evidence: .omo/evidence/task-14-node-parity.txt

  Scenario: Edge label parity across all engines
    Tool: Bash (bun test)
    Steps:
      1. Create diagram with labeled edges
      2. Layout with all engines
      3. Compare edge.labelPosition across engines
      4. Assert all identical
    Expected Result: Same edge label positions from all engines
    Evidence: .omo/evidence/task-14-edge-parity.txt

  Scenario: Edge case - unicode labels
    Tool: Bash (bun test)
    Steps:
      1. Create nodes with unicode labels (emoji, CJK, arabic)
      2. Assert all engines size them consistently
    Expected Result: Unicode handled consistently
    Evidence: .omo/evidence/task-14-unicode.txt
  ```

  **Commit**: YES
  - Message: `test(layout): add cross-engine geometry parity tests`
  - Files: `packages/layout/src/__tests__/engine-parity.test.ts`

- [x] 15. Regenerate Golden SVGs

  **What to do**:
  - Run `UPDATE_GOLDEN=1 bun test packages/renderer-svg/` to regenerate all golden SVGs
  - Review all diffs to ensure only expected geometry changes (no visual regressions beyond positioning fixes)
  - Commit updated golden files

  **Must NOT do**:
  - Manually edit golden SVGs
  - Accept diffs that show visual regressions beyond positioning fixes
  - Skip reviewing diffs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 10, 11, 12)
  - **Parallel Group**: Wave 4b (after Task 12)
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 10, 11, 12

  **References**:
  - `packages/renderer-svg/src/__tests__/renderer.test.ts:160-165` — golden update mechanism
  - `packages/renderer-svg/src/__tests__/golden/` — all golden SVG fixture files
  - `packages/renderer-svg/src/__tests__/text-quality.test.ts` — text quality tests

  **Acceptance Criteria**:
  - [ ] All golden SVGs regenerated
  - [ ] All tests pass with new goldens
  - [ ] Diffs reviewed and contain only positioning fixes
  - [ ] `bun test packages/renderer-svg/` → PASS
  - [ ] `bun run check` → PASS

  **QA Scenarios**:

  ```
  Scenario: Golden regeneration clean
    Tool: Bash
    Steps:
      1. Run UPDATE_GOLDEN=1 bun test packages/renderer-svg/
      2. Run bun test packages/renderer-svg/ (second run, no refresh)
      3. Assert all tests pass without any changes needed
    Expected Result: Goldens are stable and deterministic
    Evidence: .omo/evidence/task-15-golden-stable.txt

  Scenario: Determinism check
    Tool: Bash
    Steps:
      1. Run bun test packages/renderer-svg/ twice
      2. Compare SVG output from both runs
      3. Assert byte-for-byte identical
    Expected Result: Fully deterministic output
    Evidence: .omo/evidence/task-15-determinism.txt
  ```

  **Commit**: YES
  - Message: `chore: regenerate golden SVGs for centralized positioning`
  - Files: `packages/renderer-svg/src/__tests__/golden/*.svg`

- [x] 16. Update Serena Memories and Documentation

  **What to do**:
  - Update Serena memory `project-overview` to reflect the centralized pipeline
  - Update Serena memory `package-dependencies` if dependency graph changed
  - Update Serena memory `conventions` with the new geometry contract
  - Update `AGENTS.md` if needed to reflect the pipeline change
  - Ensure `packages/layout/src/index.ts` exports all new shared functions

  **Must NOT do**:
  - Create new documentation files
  - Change public API documentation beyond barrel exports

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 14, 15)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 14, 15

  **References**:
  - Serena memories: `project-overview`, `package-dependencies`, `conventions`
  - `AGENTS.md` — project-level agent guidelines
  - `packages/layout/src/index.ts` — barrel exports to verify

  **Acceptance Criteria**:
  - [ ] Serena memories updated with centralized pipeline info
  - [ ] `AGENTS.md` updated if pipeline change affects agent workflow
  - [ ] `packages/layout/src/index.ts` exports all new shared functions
  - [ ] `bun run build` → PASS

  **QA Scenarios**:

  ```
  Scenario: Serena memories contain centralized pipeline info
    Tool: Bash (serena_read_memory)
    Steps:
      1. Read memory "project-overview"
      2. Assert it mentions centralized geometry pipeline
    Expected Result: Memory reflects new architecture
    Evidence: .omo/evidence/task-16-memories.txt

  Scenario: Layout barrel exports all shared functions
    Tool: Bash (bun test)
    Steps:
      1. Import { computeSelfLoopWaypoints, computeCanvasBounds, sizeEdgeLabels } from '@drawspec/layout'
      2. Assert all imports succeed
    Expected Result: All shared functions publicly exported
    Evidence: .omo/evidence/task-16-exports.txt
  ```

  **Commit**: YES
  - Message: `docs: update Serena memories and documentation for centralized pipeline`
  - Files: `.serena/memories/project-overview.md`, `.serena/memories/package-dependencies.md`, `.serena/memories/conventions.md`, `AGENTS.md`, `packages/layout/src/index.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.**

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + biome + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration (features working together). Test edge cases: empty labels, very long labels, unicode, self-loops, parallel edges, disconnected components. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `refactor(layout): define complete geometry contract for positioned diagrams`
- **Task 2**: `refactor(layout): centralize self-loop routing to graph-utils`
- **Task 3**: `refactor(layout): centralize canvas bounds computation to graph-utils`
- **Task 4**: `refactor(renderer-svg): add deterministic error on missing geometry`
- **Task 5**: `refactor(layout-dagre): integrate shared node sizing`
- **Task 6**: `refactor(layout-wasm): integrate shared node sizing and expand bridge`
- **Task 7**: `feat(layout): add shared edge label positioning`
- **Task 8**: `refactor(renderer-svg): remove node label fallbacks`
- **Task 9**: `refactor(layout): centralize group label positioning`
- **Task 10**: `refactor(renderer-svg): remove edge label fallbacks`
- **Task 11**: `refactor(renderer-svg): remove overlap avoidance from renderer`
- **Task 12**: `fix(renderer-svg): include labels in autoFit bounds`
- **Task 13**: `refactor(layout-elk): use shared edge label positioning`
- **Task 14**: `test(layout): add cross-engine geometry parity tests`
- **Task 15**: `chore: regenerate golden SVGs for centralized positioning`
- **Task 16**: `docs: update Serena memories and documentation for centralized pipeline`

---

## Success Criteria

### Verification Commands
```bash
bun run check                    # Expected: all pass (build + typecheck + lint + test)
bun test packages/layout/        # Expected: all geometry tests pass
bun test packages/layout-dagre/  # Expected: dagre uses shared sizing
bun test packages/layout-elk/    # Expected: elk uses shared edge labels
bun test packages/layout-wasm/   # Expected: wasm uses shared sizing
bun test packages/renderer-svg/  # Expected: no fallback tests, golden tests updated
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] All layout engines produce identical geometry for same input
- [ ] Renderer has zero geometry computation code
- [ ] Golden SVGs reviewed and approved
