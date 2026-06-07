import { createDeterministicId } from "@drawspec/core";
import type {
  FlowBuilder,
  FlowchartBuilderContext,
  FlowchartDefinition,
  FlowchartEdge,
  FlowchartElement,
  FlowchartNode,
  FlowchartNodeKind,
  FlowchartTarget,
} from "./types";

// ── Mutable node ──────────────────────────────────────────────────────────

class MutableFlowchartNode implements FlowchartNode {
  readonly id: string;
  readonly label: string;
  readonly kind: FlowchartNodeKind;
  readonly outgoing: FlowchartEdge[] = [];
  readonly #builder: MutableFlowchartBuilder;

  /** Child ids for subgraph nodes. */
  childIds: readonly string[] = [];

  constructor(
    kind: FlowchartNodeKind,
    label: string,
    index: number,
    builder: MutableFlowchartBuilder
  ) {
    this.kind = kind;
    this.label = label;
    this.#builder = builder;
    this.id = createDeterministicId(
      { kind: "flowchart-node", nodeKind: kind, label, index },
      { prefix: "fc", length: 10 }
    );
  }

  to(target: FlowchartTarget): FlowBuilder {
    return this.#builder.flow(this, target);
  }
}

// ── Flow builder ──────────────────────────────────────────────────────────

class MutableFlowBuilder implements FlowBuilder {
  readonly edge: FlowchartEdge;
  readonly #builder: MutableFlowchartBuilder;
  readonly #targetElement: FlowchartNode;

  constructor(edge: FlowchartEdge, builder: MutableFlowchartBuilder, targetElement: FlowchartNode) {
    this.edge = edge;
    this.#builder = builder;
    this.#targetElement = targetElement;
  }

  when(label: string): FlowBuilder {
    this.#builder.labelEdge(this.edge, label);
    return this;
  }

  to(target: FlowchartTarget): FlowBuilder {
    return this.#builder.flow(this.#targetElement, target);
  }
}

// ── Main builder ──────────────────────────────────────────────────────────

export class MutableFlowchartBuilder implements FlowchartBuilderContext {
  readonly title: string;
  readonly elements: FlowchartElement[] = [];
  readonly edges: FlowchartEdge[] = [];
  readonly #elementsByLabel = new Map<string, FlowchartNode>();
  #elementCount = 0;
  #edgeCount = 0;

  constructor(title: string) {
    this.title = title;
  }

  process_(
    label: string,
    define?: (node: never) => FlowchartDefinition
  ): import("./types").ProcessNode {
    const node = this.createNode("process", label);
    define?.(node as never);
    return node as import("./types").ProcessNode;
  }

  decision(
    label: string,
    define?: (node: never) => FlowchartDefinition
  ): import("./types").DecisionNode {
    const node = this.createNode("decision", label);
    define?.(node as never);
    return node as import("./types").DecisionNode;
  }

  terminal(label: string): import("./types").TerminalNode {
    return this.createNode("terminal", label) as import("./types").TerminalNode;
  }

  io(label: string): import("./types").IoNode {
    return this.createNode("io", label) as import("./types").IoNode;
  }

  connector(label: string): import("./types").ConnectorNode {
    return this.createNode("connector", label) as import("./types").ConnectorNode;
  }

  subgraph(
    label: string,
    define: (ctx: FlowchartBuilderContext) => FlowchartDefinition
  ): import("./types").SubgraphNode {
    const subgraphNode = this.createNode("subgraph", label) as MutableFlowchartNode;
    const snapshot = this.#elementCount;

    define(this.context());

    // Collect child ids — elements added inside the subgraph define callback
    const childIds = this.elements.slice(snapshot).map((element) => element.id);
    subgraphNode.childIds = childIds;

    return subgraphNode as import("./types").SubgraphNode;
  }

  flow(source: FlowchartTarget, target: FlowchartTarget): FlowBuilder {
    const sourceElement = this.resolveTarget(source);
    const targetElement = this.resolveTarget(target);

    const edge: FlowchartEdge = {
      id: createDeterministicId(
        {
          kind: "flowchart-edge",
          sourceId: sourceElement.id,
          targetId: targetElement.id,
          index: this.#edgeCount,
        },
        { prefix: "fce", length: 10 }
      ),
      sourceId: sourceElement.id,
      targetId: targetElement.id,
    };

    this.#edgeCount += 1;
    this.mutable(sourceElement).outgoing.push(edge);
    this.edges.push(edge);

    return new MutableFlowBuilder(edge, this, targetElement);
  }

  labelEdge(edge: FlowchartEdge, label: string): void {
    const index = this.edges.indexOf(edge);
    if (index === -1) {
      return;
    }

    const labeled = { ...edge, label };
    this.edges[index] = labeled;

    const source = this.elements.find((el) => el.id === edge.sourceId);
    const outgoingIndex = source?.outgoing.indexOf(edge) ?? -1;
    if (source && outgoingIndex >= 0) {
      this.mutable(source).outgoing[outgoingIndex] = labeled;
    }
  }

  context(): FlowchartBuilderContext {
    return {
      process_: this.process_.bind(this),
      decision: this.decision.bind(this),
      terminal: this.terminal.bind(this),
      io: this.io.bind(this),
      connector: this.connector.bind(this),
      subgraph: this.subgraph.bind(this),
    };
  }

  toModel(): import("./types").FlowchartDomainModel {
    return {
      id: createDeterministicId(
        { kind: "flowchart-document", title: this.title },
        { prefix: "fcdoc", length: 10 }
      ),
      title: this.title,
      elements: this.elements,
      edges: this.edges,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private createNode(kind: FlowchartNodeKind, label: string): FlowchartNode {
    const existing = this.#elementsByLabel.get(label);

    if (existing) {
      return existing;
    }

    const element = new MutableFlowchartNode(kind, label, this.#elementCount, this);
    this.#elementCount += 1;
    this.elements.push(element);
    this.#elementsByLabel.set(label, element);
    return element;
  }

  private resolveTarget(target: FlowchartTarget): FlowchartNode {
    return typeof target === "string" ? this.createNode("process", target) : target;
  }

  private mutable(element: FlowchartNode): MutableFlowchartNode {
    return element as MutableFlowchartNode;
  }
}
