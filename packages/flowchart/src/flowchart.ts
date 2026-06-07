import { MutableFlowchartBuilder } from "./builders";
import { compileFlowchartDocument } from "./compile";
import type { FlowchartBuilderContext, FlowchartDefinition, FlowchartDocument } from "./types";

/**
 * Create a flowchart diagram with a builder callback.
 *
 * @param title - Diagram title.
 * @param define - Callback receiving builder context for defining nodes and edges.
 * @returns Compiled FlowchartDocument IR.
 */
export function flowchartDiagram(
  title: string,
  define?: (ctx: FlowchartBuilderContext) => FlowchartDefinition
): FlowchartDocument {
  const builder = new MutableFlowchartBuilder(title);
  define?.(builder.context());
  return compileFlowchartDocument(builder.toModel());
}

/**
 * Curried flowchart API: `flowchart("title")((ctx) => { ... })`.
 *
 * @param title - Diagram title.
 * @returns A function that accepts a builder callback and returns the compiled document.
 */
export function flowchart(
  title: string
): (define: (ctx: FlowchartBuilderContext) => FlowchartDefinition) => FlowchartDocument;
export function flowchart(
  title: string,
  define: (ctx: FlowchartBuilderContext) => FlowchartDefinition
): FlowchartDocument;
export function flowchart(
  title: string,
  define?: (ctx: FlowchartBuilderContext) => FlowchartDefinition
):
  | FlowchartDocument
  | ((define: (ctx: FlowchartBuilderContext) => FlowchartDefinition) => FlowchartDocument) {
  if (define !== undefined) {
    return flowchartDiagram(title, define);
  }
  return (cb: (ctx: FlowchartBuilderContext) => FlowchartDefinition) => flowchartDiagram(title, cb);
}
