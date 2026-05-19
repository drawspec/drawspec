import { compileActivityDocument } from "./compile";
import { withActiveActivityBuilder } from "./context";
import type {
  ActionElement,
  ActivityBranchBuilder,
  ActivityBuilderContext,
  ActivityDefinition,
  ActivityDocument,
  ActivityDomainModel,
  ActivityElement,
  ActivityFlowBuilder,
  ActivityNodeKind,
  ActivityTarget,
  ControlElement,
  DecisionElement,
  FlowEdge,
} from "./types";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function deterministicId(prefix: string, parts: readonly string[]): string {
  let hash = FNV_OFFSET_BASIS;
  const input = parts.join("\u001f");

  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), FNV_PRIME) >>> 0;
  }

  return `${prefix}_${hash.toString(16).padStart(8, "0")}`;
}

class MutableActivityElement implements ActivityElement {
  readonly id: string;
  readonly label: string;
  kind: ActivityNodeKind;
  readonly outgoing: FlowEdge[] = [];
  readonly #builder: MutableActivityBuilder;

  constructor(
    kind: ActivityNodeKind,
    label: string,
    index: number,
    builder: MutableActivityBuilder
  ) {
    this.kind = kind;
    this.label = label;
    this.#builder = builder;
    this.id = deterministicId("act", ["element", kind, label, index.toString()]);
  }

  to(target: ActivityTarget): ActivityFlowBuilder {
    return this.#builder.flow(this, target);
  }

  when(label: string): ActivityBranchBuilder {
    return new MutableActivityBranchBuilder(this as DecisionElement, label);
  }
}

class MutableActivityFlowBuilder implements ActivityFlowBuilder {
  readonly flow: FlowEdge;
  readonly #builder: MutableActivityBuilder;
  readonly #target: ActivityElement;

  constructor(flow: FlowEdge, builder: MutableActivityBuilder, target: ActivityElement) {
    this.flow = flow;
    this.#builder = builder;
    this.#target = target;
  }

  when(label: string): ActivityFlowBuilder {
    this.#builder.labelFlow(this.flow, label);
    return this;
  }

  to(target: ActivityTarget): ActivityFlowBuilder {
    return this.#builder.flow(this.#target, target);
  }
}

class MutableActivityBranchBuilder implements ActivityBranchBuilder {
  readonly #source: DecisionElement;
  readonly #label: string;

  constructor(source: DecisionElement, label: string) {
    this.#source = source;
    this.#label = label;
  }

  to(target: ActivityTarget): ActivityFlowBuilder {
    return this.#source.to(target).when(this.#label);
  }
}

export class MutableActivityBuilder implements ActivityBuilderContext {
  readonly title: string;
  readonly elements: ActivityElement[] = [];
  readonly flows: FlowEdge[] = [];
  readonly #elementsByLabel = new Map<string, ActivityElement>();
  #elementCount = 0;
  #flowCount = 0;

  constructor(title: string) {
    this.title = title;
  }

  action(label: string, define?: (action: ActionElement) => ActivityDefinition): ActionElement {
    const element = this.element("action", label) as ActionElement;
    define?.(element);
    return element;
  }

  decision(
    label: string,
    define?: (decision: DecisionElement) => ActivityDefinition
  ): DecisionElement {
    const element = this.element("decision", label) as DecisionElement;
    define?.(element);
    return element;
  }

  start(label = "start"): ControlElement {
    return this.element("initial", label) as ControlElement;
  }

  end(label = "end"): ControlElement {
    return this.element("final", label) as ControlElement;
  }

  flow(source: ActivityTarget, target: ActivityTarget): ActivityFlowBuilder {
    const sourceElement = this.resolveTarget(source);
    const targetElement = this.resolveTarget(target);
    const flow: FlowEdge = {
      id: deterministicId("flow", [
        "flow",
        sourceElement.id,
        targetElement.id,
        this.#flowCount.toString(),
      ]),
      sourceId: sourceElement.id,
      targetId: targetElement.id,
    };

    this.#flowCount += 1;
    this.mutableElement(sourceElement).outgoing.push(flow);
    this.flows.push(flow);
    return new MutableActivityFlowBuilder(flow, this, targetElement);
  }

  labelFlow(flow: FlowEdge, label: string): void {
    const index = this.flows.indexOf(flow);

    if (index === -1) {
      return;
    }

    const labeledFlow = { ...flow, label };
    this.flows[index] = labeledFlow;
    const source = this.elements.find((element) => element.id === flow.sourceId);
    const outgoingIndex = source?.outgoing.indexOf(flow) ?? -1;

    if (source && outgoingIndex >= 0) {
      this.mutableElement(source).outgoing[outgoingIndex] = labeledFlow;
    }
  }

  context(): ActivityBuilderContext {
    return {
      action: this.action.bind(this),
      decision: this.decision.bind(this),
      start: this.start.bind(this),
      end: this.end.bind(this),
    };
  }

  toModel(): ActivityDomainModel {
    return {
      id: deterministicId("actdoc", ["document", this.title]),
      title: this.title,
      elements: this.elements,
      flows: this.flows,
    };
  }

  private element(kind: ActivityNodeKind, label: string): ActivityElement {
    const existingElement = this.#elementsByLabel.get(label);

    if (existingElement) {
      this.mutableElement(existingElement).kind = kind;
      return existingElement;
    }

    const element = new MutableActivityElement(kind, label, this.#elementCount, this);

    this.#elementCount += 1;
    this.elements.push(element);
    this.#elementsByLabel.set(label, element);
    return element;
  }

  private resolveTarget(target: ActivityTarget): ActivityElement {
    return typeof target === "string" ? this.element("action", target) : target;
  }

  private mutableElement(element: ActivityElement): MutableActivityElement {
    return element as MutableActivityElement;
  }
}

export function activityDiagram(
  title: string,
  define?: (context: ActivityBuilderContext) => ActivityDefinition
): ActivityDocument {
  const builder = new MutableActivityBuilder(title);
  withActiveActivityBuilder(builder, () => define?.(builder.context()));
  return compileActivityDocument(builder.toModel());
}

export function activity(title: string) {
  return (define?: (context: ActivityBuilderContext) => ActivityDefinition): ActivityDocument =>
    activityDiagram(title, define);
}
