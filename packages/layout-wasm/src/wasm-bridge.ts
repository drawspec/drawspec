/**
 * Contract between the layout engine and a WASM graph layout binary.
 *
 * Implement this interface to integrate a WASM-based layout algorithm
 * (e.g., Graphviz's dot compiled to WASM, or a custom Rust/C++ layout
 * algorithm). The engine serialises the graph into `WasmGraphInput`,
 * calls `compute()`, and deserialises the `WasmLayoutResult`.
 *
 * The TypeScript fallback (`TypeScriptFallbackBridge`) implements this
 * same interface using pure JS, so the engine is agnostic to the backend.
 */

export interface WasmNodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WasmEdgeRoute {
  id: string;
  waypoints: Array<{ x: number; y: number }>;
}

export interface WasmInputNode {
  id: string;
  width: number;
  height: number;
}

export interface WasmGraphInput {
  nodes: WasmInputNode[];
  edges: Array<{ id: string; sourceId: string; targetId: string }>;
  direction: "TB" | "BT" | "LR" | "RL";
  nodeSize: { width: number; height: number };
  spacing: { node: number; rank: number };
  padding: number;
}

export interface WasmLayoutResult {
  nodes: WasmNodePosition[];
  edges: WasmEdgeRoute[];
  width: number;
  height: number;
}

export interface WasmBridge {
  readonly name: string;
  compute(input: WasmGraphInput): Promise<WasmLayoutResult>;
}
