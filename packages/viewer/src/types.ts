import type { Diagnostic, DiagramDocument } from "@drawspec/core";

export type DrawspecTheme = "light" | "dark";

export interface ViewerPayload {
  document?: DiagramDocument;
  svg?: string;
  diagnostics?: Diagnostic[];
}

export interface DrawspecDiagramElement extends HTMLElement {
  src: string;
  theme: DrawspecTheme;
  interactive: boolean;
  svg: string;
  diagnostics: Diagnostic[];
}
