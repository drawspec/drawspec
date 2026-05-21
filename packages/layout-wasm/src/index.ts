/**
 * @drawspec/layout-wasm — WASM-based graph layout adapter
 *
 * Provides a LayoutEngine implementation that can delegate graph layout
 * computation to a WASM module. Ships with a pure TypeScript fallback
 * (layered Sugiyama-style layout) for environments without WASM support.
 *
 * ## WASM Integration Points
 *
 * The `WasmBridge` interface defines the contract between this adapter
 * and a WASM graph layout binary. To integrate a real WASM module:
 *
 * 1. Implement `WasmBridge` — your WASM module must accept a serialised
 *    graph (nodes + edges + options) and return node positions + edge routes.
 * 2. Pass the bridge to `wasmLayout(bridge)`.
 * 3. The engine will call `bridge.compute()` on every layout invocation.
 *
 * The fallback `TypeScriptFallbackBridge` is used when no WASM bridge is
 * provided. It implements a deterministic layered (Sugiyama-style) algorithm:
 *   a. Cycle removal via DFS feedback arc set
 *   b. Topological ranking (longest path)
 *   c. Node ordering within ranks (barycenter heuristic)
 *   d. Coordinate assignment
 */

export { TypeScriptFallbackBridge } from "./fallback";
export type {
  WasmBridge,
  WasmEdgeRoute,
  WasmGraphInput,
  WasmLayoutResult,
  WasmNodePosition,
} from "./wasm-bridge";
export { WasmLayoutEngine, wasmLayout } from "./wasm-layout";
