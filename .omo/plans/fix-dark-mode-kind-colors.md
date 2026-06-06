# Fix: Dark Mode Entity Kind Colors

**Branch**: `fix/dark-mode-kind-colors`
**Base**: `main`
**PR**: One commit, one fix.

## Problem

`packages/renderer-svg/src/styles.ts:101-108` defines `kindDefaults` with hardcoded light color values:

```ts
const kindDefaults: Record<string, Partial<ResolvedStyle>> = {
  actor:       { fill: "#eef2ff",  stroke: "#4338ca" },
  container:   { fill: "#ecfeff",  stroke: "#0891b2" },
  database:    { fill: "#fef3c7",  stroke: "#b45309" },
  person:      { fill: "#f0fdf4",  stroke: "#15803d" },
  participant: { fill: "#f8fafc",  stroke: "#334155" },
  sequence:    { fill: "#f8fafc",  stroke: "#334155" },
};
```

In `resolveStyle()` (line 244), `kindStyle` spreads **after** `base`, overriding `theme.nodeFill` even when the theme is dark. The dark SVG renders actors as `#eef2ff` (bright blue) instead of `#1e293b`.

Additionally, two separate dark-theme paths exist with different coverage:

| Source | Sets |
|---|---|
| CLI `shared.ts` | background, nodeFill, groupFill, edgeStroke, text, activation |
| Viewer `render.ts` | background, text only |

## Solution

### Fix A: `kindDefaults` — make theme-aware

Add a `darkKindDefaults` map with dark-appropriate hues:

```ts
const darkKindDefaults: Record<string, Partial<ResolvedStyle>> = {
  actor:       { fill: "#312e81",  stroke: "#818cf8" },
  container:   { fill: "#164e63",  stroke: "#22d3ee" },
  database:    { fill: "#713f12",  stroke: "#f59e0b" },
  person:      { fill: "#14532d",  stroke: "#4ade80" },
  participant: { fill: "#1e293b",  stroke: "#94a3b8" },
  sequence:    { fill: "#1e293b",  stroke: "#94a3b8" },
};
```

In `resolveStyle()`, detect dark theme and select the appropriate defaults:

```ts
const isDarkTheme = theme.background === darkTheme.background; // heuristic
const kindDefaultsSet = isDarkTheme ? darkKindDefaults : kindDefaults;
const kindStyle = kindDefaultsSet[entity.kind] ?? {};
```

### Fix B: Viewer dark theme — fill the gaps

`packages/viewer/src/render.ts` currently only sets `background` and `text` for dark mode. Add the missing fields:

| Field | Dark Value |
|---|---|
| `nodeFill` | `#1e293b` |
| `nodeStroke` | `#64748b` |
| `edgeStroke` | `#94a3b8` |
| `groupFill` | `#111827` |
| `groupStroke` | `#475569` |
| `activationFill` | `#0c4a6e` |
| `activationStroke` | `#38bdf8` |

## Files Changed

| File | Change |
|---|---|
| `packages/renderer-svg/src/styles.ts` | Add `darkKindDefaults`, detect dark in `resolveStyle` |
| `packages/viewer/src/render.ts` | Add full set of dark theme overrides |
| Golden SVGs (10 files) | Regenerated |

## QA Scenarios

### Scenario 1: Dark mode kind colors resolve correctly
1. **Command**: `bun test packages/renderer-svg/src/__tests__/theme.test.ts`  
2. **Expected**: All theme tests pass, including new assertions that verify dark mode resolves `actor` fill to `#312e81`, `container` to `#164e63`, etc.

### Scenario 2: Light mode unchanged
1. **Command**: `bun test packages/renderer-svg/src/__tests__/renderer.test.ts`  
2. **Expected**: All renderer tests pass — light mode output is unchanged.

### Scenario 3: Viewer dark theme has full coverage
1. **Inspect**: Read `packages/viewer/src/render.ts` — verify all 7 theme fields (`nodeFill`, `nodeStroke`, `edgeStroke`, `groupFill`, `groupStroke`, `activationFill`, `activationStroke`) are set in the dark mode block, not just `background` and `text`.

### Scenario 4: No regression — full check
1. **Command**: `bun run check`  
2. **Expected**: All tests pass, typecheck clean, biome clean.

### Scenario 5: Golden fixtures match
1. **Command**: `bun test golden-freshness.test.ts`  
2. **Expected**: Passes (no stale golden files after regeneration).

## Risks & Mitigations

- **Theme detection heuristic**: Comparing `theme.background === darkTheme.background` is brittle (custom themes with coincidentally matching background would be misclassified).  
  → **Adopted approach from Momus feedback**: Thread an explicit `themeName: SvgThemeInput` through `resolveStyle` instead of using a heuristic. This requires adding a `themeName` parameter to `resolveStyle()` and passing it from the three call sites (`renderGroup`, `renderNode`, `renderEdge`, `renderActivation`). Small, explicit API surface increase that prevents false classification.

- **Visual regression**: Dark kind colors shift from "light hue" to "dark hue" — different saturation/brightness but same hue family. Actors remain indigo-ish, containers remain cyan-ish, etc. Users reading diagrams in dark mode will still distinguish kinds by color, just with appropriate luminance.

- **Viewer consistency**: The viewer dark theme now matches the CLI's dark theme values. Both paths produce visually identical output for the same input.
