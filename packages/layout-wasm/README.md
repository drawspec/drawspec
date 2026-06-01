# @drawspec/layout-wasm

TypeScript layout fallback adapter for DrawSpec graph diagrams.

## Overview

This package provides a `LayoutEngine` implementation that **can** delegate to a WASM module for high-performance graph layout. However, **no WASM binary is currently shipped** — the package uses `TypeScriptFallbackBridge` for all layout operations.

## Current State

- **WASM acceleration**: Planned but not yet implemented
- **Current implementation**: Pure TypeScript fallback using a layered Sugiyama-style layout algorithm
- **Bridge interface**: `WasmBridge` interface is provided for future WASM integration

## Usage

```typescript
import { wasmLayout } from "@drawspec/layout-wasm";

// Currently uses TypeScriptFallbackBridge internally
const engine = wasmLayout();

// Future: when WASM binary is available
// const engine = wasmLayout(myWasmBridge);
```

## Performance

The TypeScript fallback is suitable for diagrams up to approximately **500 nodes**. For larger diagrams, WASM acceleration is planned.

| Diagram Size | Expected Performance |
|--------------|---------------------|
| ~10 nodes    | < 1ms               |
| ~100 nodes   | ~1-5ms              |
| ~500 nodes   | ~50-200ms           |
| > 500 nodes  | Consider WASM       |

## Architecture

```
WasmLayoutEngine
    └── WasmBridge (interface)
            └── TypeScriptFallbackBridge (current)
            └── (future: WasmBridge implementation with actual WASM binary)
```

## Files

- `src/wasm-layout.ts` — Main engine implementation
- `src/wasm-bridge.ts` — `WasmBridge` interface definition
- `src/fallback.ts` — `TypeScriptFallbackBridge` implementation
