import type { Diagnostic } from "./diagnostic";

export type DiagramKind =
  | "architecture"
  | "sequence"
  | "class"
  | "component"
  | "deployment"
  | "state"
  | "activity"
  | "use-case"
  | "object"
  | "timing"
  | "er"
  | "graph";

export interface SourceRef {
  file: string;
  line: number;
  column: number;
  symbol?: string;
}

export interface StyleRef {
  id: string;
  variant?: string;
}

export interface LayoutSpec {
  engine?: string;
  direction?: "tb" | "bt" | "lr" | "rl";
  rankSpacing?: number;
  nodeSpacing?: number;
  metadata?: Record<string, unknown>;
}

export interface StyleSheet {
  tokens?: Record<string, string | number>;
  rules?: Record<string, Record<string, string | number>>;
}

export interface DiagramDocument {
  schemaVersion: string;
  id: string;
  title?: string;
  kind: DiagramKind;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  annotations: DiagramAnnotation[];
  layout?: LayoutSpec;
  styles?: StyleSheet;
  metadata?: Record<string, unknown>;
  diagnostics?: Diagnostic[];
}

export interface DiagramNode {
  id: string;
  kind: string;
  label?: string;
  description?: string;
  parentId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}

export interface DiagramEdge {
  id: string;
  kind: string;
  sourceId: string;
  targetId: string;
  label?: string;
  direction?: "forward" | "backward" | "bidirectional" | "none";
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}

export interface DiagramGroup {
  id: string;
  kind: string;
  label?: string;
  description?: string;
  parentId?: string;
  childIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}

export interface DiagramAnnotation {
  id: string;
  kind: string;
  label?: string;
  description?: string;
  targetId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  style?: StyleRef;
  source?: SourceRef;
}
