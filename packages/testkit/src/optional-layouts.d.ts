// Type declarations for optional layout engine packages
// These packages are loaded dynamically at runtime via import()

declare module "@drawspec/layout-dagre" {
  import type { LayoutEngine } from "@drawspec/layout";
  export function dagreLayout(): LayoutEngine;
}

declare module "@drawspec/layout-elk" {
  import type { LayoutEngine } from "@drawspec/layout";
  export function elkLayout(): LayoutEngine;
}

declare module "@drawspec/layout-wasm" {
  import type { LayoutEngine } from "@drawspec/layout";
  export function wasmLayout(): LayoutEngine;
}

declare module "@drawspec/layout-force" {
  import type { LayoutEngine } from "@drawspec/layout";
  export function forceLayout(): LayoutEngine;
}

declare module "@drawspec/layout-tree" {
  import type { LayoutEngine } from "@drawspec/layout";
  export function treeLayout(): LayoutEngine;
}
