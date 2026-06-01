import type { Diagnostic, DiagramDocument } from "@drawspec/core";
import type { ArchitectureData } from "./explorer";

export type { ArchitectureData };
export type DrawspecTheme = "light" | "dark";

export interface ViewerPayload {
  document?: DiagramDocument;
  svg?: string;
  diagnostics?: Diagnostic[];
  architecture?: ArchitectureData;
}

/**
 * Detail for the `sourceselect` custom event dispatched by
 * `<drawspec-diagram>` when a user clicks a diagram element that
 * carries source location data (`data-source-file` / `data-source-line`).
 */
export interface SourceSelectDetail {
  /** Source file path relative to the workspace root. */
  file: string;
  /** 1-based line number in the source file. */
  line: number;
  /** Optional 1-based column number in the source file. */
  column?: number;
}

export interface DrawspecDiagramElement extends HTMLElement {
  src: string;
  theme: DrawspecTheme;
  interactive: boolean;
  svg: string;
  diagnostics: Diagnostic[];
  architecture: ArchitectureData | undefined;
}
