import type { DiagramDocument } from "@drawspec/core";

/** Supported flowchart node shapes. */
export type FlowchartNodeKind =
  | "process"
  | "decision"
  | "terminal"
  | "io"
  | "connector"
  | "subgraph";

/** A directed edge connecting two flowchart nodes. */
export interface FlowchartEdge {
  /** Deterministic edge identifier. */
  readonly id: string;
  /** Source node identifier. */
  readonly sourceId: string;
  /** Target node identifier. */
  readonly targetId: string;
  /** Optional label displayed on the edge. */
  readonly label?: string;
}

/** Base properties shared by all flowchart node types. */
export interface FlowchartNode {
  /** Deterministic node identifier. */
  readonly id: string;
  /** Display label for the node. */
  readonly label: string;
  /** Shape kind determining rendering. */
  readonly kind: FlowchartNodeKind;
  /** Outgoing edges from this node. */
  readonly outgoing: readonly FlowchartEdge[];
}

/** A process (action) step in a flowchart — rendered as a rounded rectangle. */
export interface ProcessNode extends FlowchartNode {
  readonly kind: "process";
}

/** A decision branch in a flowchart — rendered as a diamond. */
export interface DecisionNode extends FlowchartNode {
  readonly kind: "decision";
}

/** A terminal (start/end) node — rendered as a rounded rectangle with larger radius. */
export interface TerminalNode extends FlowchartNode {
  readonly kind: "terminal";
}

/** An input/output node — rendered as a parallelogram. */
export interface IoNode extends FlowchartNode {
  readonly kind: "io";
}

/** A connector (jump point) node — rendered as a circle. */
export interface ConnectorNode extends FlowchartNode {
  readonly kind: "connector";
}

/** A subgraph (grouping) container for related nodes. */
export interface SubgraphNode extends FlowchartNode {
  readonly kind: "subgraph";
  /** Child node identifiers contained within this subgraph. */
  readonly childIds: readonly string[];
}

/** Any concrete flowchart node type. */
export type FlowchartElement =
  | ProcessNode
  | DecisionNode
  | TerminalNode
  | IoNode
  | ConnectorNode
  | SubgraphNode;

/** Target for a flow edge — either a node reference or a label string. */
export type FlowchartTarget = string | FlowchartNode;

/** Builder for chaining flow edges from a node. */
export interface FlowBuilder {
  /** The edge created by this builder step. */
  readonly edge: FlowchartEdge;
  /** Add a branch label to the current edge. */
  when(label: string): FlowBuilder;
  /** Create a new edge from the current target to another node. */
  to(target: FlowchartTarget): FlowBuilder;
}

/** Builder API available inside `flowchart()` callbacks. */
export interface FlowchartBuilderContext {
  /** Create a process (action) node. */
  process_(label: string, define?: (node: ProcessNode) => FlowchartDefinition): ProcessNode;
  /** Create a decision (branch) node. */
  decision(label: string, define?: (node: DecisionNode) => FlowchartDefinition): DecisionNode;
  /** Create a terminal (start/end) node. */
  terminal(label: string): TerminalNode;
  /** Create an input/output node. */
  io(label: string): IoNode;
  /** Create a connector (jump point) node. */
  connector(label: string): ConnectorNode;
  /** Create a subgraph container. */
  subgraph(
    label: string,
    define: (ctx: FlowchartBuilderContext) => FlowchartDefinition
  ): SubgraphNode;
}

/** Values accepted inside `flowchart()` callback return arrays. */
export type FlowchartDefinition =
  | FlowchartElement
  | FlowBuilder
  | readonly FlowchartDefinition[]
  | undefined;

/** Domain model produced by the flowchart builder before compilation. */
export interface FlowchartDomainModel {
  readonly id: string;
  readonly title: string;
  readonly elements: readonly FlowchartElement[];
  readonly edges: readonly FlowchartEdge[];
}

/** Compiled flowchart document in DrawSpec IR format. */
export type FlowchartDocument = DiagramDocument & { kind: "graph" };
