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

export interface DrawspecDiagramElement extends HTMLElement {
  src: string;
  theme: DrawspecTheme;
  interactive: boolean;
  svg: string;
  diagnostics: Diagnostic[];
  architecture: ArchitectureData | undefined;
}
