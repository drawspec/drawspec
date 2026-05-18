import type {
  Diagnostic,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  SourceRef,
} from "@drawspec/core";

export type RuleSeverity = "off" | "info" | "warn" | "error";
export type DiagnosticSeverity = Exclude<Diagnostic["severity"], "hint">;

export type RuleConfigEntry<Options = unknown> = RuleSeverity | [RuleSeverity, Options];
export type RuleConfig = Record<string, RuleConfigEntry | undefined>;

export interface RuleConfigContext<Options = unknown> {
  severity: Exclude<RuleSeverity, "off">;
  diagnosticSeverity: DiagnosticSeverity;
  options: Options | undefined;
}

export interface DiagnosticTarget {
  kind: "element" | "relationship" | "view" | "diagram" | "node" | "edge";
  id: string;
}

export interface DiagnosticInput {
  message: string;
  source?: SourceRef;
  target?: DiagnosticTarget | string;
  help?: string;
}

export type C4ElementKind = "person" | "softwareSystem" | "container" | "database" | string;

export interface ArchitectureElementLike {
  readonly id: string;
  readonly kind: C4ElementKind;
  readonly name: string;
  readonly technology?: string;
  readonly tags?: readonly string[];
  readonly parent?: ArchitectureElementLike;
  readonly children?: readonly ArchitectureElementLike[];
}

export interface ArchitectureRelationshipLike {
  readonly id: string;
  readonly source: ArchitectureElementLike;
  readonly target: ArchitectureElementLike;
  readonly label?: string;
}

export interface ArchitectureViewLike {
  readonly id: string;
  readonly includedElements?: readonly ArchitectureElementLike[];
}

export interface ArchitectureModelLike {
  readonly elements: readonly ArchitectureElementLike[];
  readonly relationships: readonly ArchitectureRelationshipLike[];
  readonly views?:
    | readonly ArchitectureViewLike[]
    | { readonly items: readonly ArchitectureViewLike[] };
}

export interface RuleContext<Options = unknown> {
  readonly model?: ArchitectureModelLike;
  readonly diagram?: DiagramDocument;
  readonly config: RuleConfigContext<Options>;
  report(diagnostic: DiagnosticInput): void;
}

export interface RuleVisitor {
  architectureModel?(model: ArchitectureModelLike): void;
  architectureElement?(element: ArchitectureElementLike): void;
  architectureRelationship?(relationship: ArchitectureRelationshipLike): void;
  diagram?(diagram: DiagramDocument): void;
  diagramNode?(node: DiagramNode, diagram: DiagramDocument): void;
  diagramEdge?(edge: DiagramEdge, diagram: DiagramDocument): void;
}

export interface Rule<Options = unknown> {
  readonly name: string;
  readonly meta: {
    readonly description: string;
    readonly recommended?: boolean;
    readonly fixable?: boolean;
    readonly defaultSeverity?: Exclude<RuleSeverity, "off">;
  };
  create(context: RuleContext<Options>): RuleVisitor | undefined;
}

export interface ValidationConfig {
  readonly rules?: RuleConfig;
}

export interface ValidationInput {
  readonly model?: ArchitectureModelLike;
  readonly diagram?: DiagramDocument;
  readonly config?: ValidationConfig;
}

export interface ValidationResult {
  readonly diagnostics: Diagnostic[];
}
