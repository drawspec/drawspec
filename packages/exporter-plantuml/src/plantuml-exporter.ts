import type { DiagramDocument, DiagramEdge, DiagramNode } from "@drawspec/core";

function nodeLabel(node: DiagramNode): string {
  return node.label ?? node.id;
}

function arrowOp(direction?: "forward" | "backward" | "bidirectional" | "none"): string {
  switch (direction) {
    case "backward":
      return "<-";
    case "bidirectional":
      return "<->";
    case "none":
      return "--";
    default:
      return "->";
  }
}

function esc(text: string): string {
  return text.replace(/"/g, '\\"');
}

function exportSequence(doc: DiagramDocument): string[] {
  const lines: string[] = [];

  for (const node of doc.nodes) {
    if (node.kind === "participant" || node.kind === "actor") {
      const kw = node.kind === "actor" ? "actor" : "participant";
      const lbl = node.label ? ` "${esc(node.label)}"` : "";
      lines.push(`${kw} "${esc(node.id)}"${lbl ? ` as${lbl}` : ""}`);
    }
  }

  for (const group of doc.groups) {
    if (
      group.kind === "alt" ||
      group.kind === "opt" ||
      group.kind === "loop" ||
      group.kind === "par"
    ) {
      lines.push(`${group.kind} ${esc(group.label ?? group.id)}`);
      const childEdges = (group.childIds ?? [])
        .map((cid) => doc.edges.find((e) => e.id === cid))
        .filter((e): e is DiagramEdge => e !== undefined);
      for (const edge of childEdges) {
        const label = edge.label ? ` : ${esc(edge.label)}` : "";
        lines.push(
          `${esc(edge.sourceId)} ${arrowOp(edge.direction)} ${esc(edge.targetId)}${label}`
        );
      }
      lines.push("end");
    }
  }

  const groupedEdgeIds = new Set(doc.groups.flatMap((g) => g.childIds ?? []));
  for (const edge of doc.edges) {
    if (!groupedEdgeIds.has(edge.id)) {
      const label = edge.label ? ` : ${esc(edge.label)}` : "";
      lines.push(`${esc(edge.sourceId)} ${arrowOp(edge.direction)} ${esc(edge.targetId)}${label}`);
    }
  }

  return lines;
}

function exportClass(doc: DiagramDocument): string[] {
  const lines: string[] = [];
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));

  for (const node of doc.nodes) {
    if (
      node.kind === "class" ||
      node.kind === "interface" ||
      node.kind === "abstract" ||
      node.kind === "enum"
    ) {
      const stereotype =
        node.kind === "interface"
          ? " <<interface>>"
          : node.kind === "abstract"
            ? " <<abstract>>"
            : node.kind === "enum"
              ? " <<enum>>"
              : "";
      const members = (node.metadata?.["members"] as string[] | undefined) ?? [];
      const methods = (node.metadata?.["methods"] as string[] | undefined) ?? [];
      lines.push(`class "${esc(nodeLabel(node))}"${stereotype} {`);
      for (const m of members) {
        lines.push(`  ${m}`);
      }
      for (const m of methods) {
        lines.push(`  ${m}`);
      }
      lines.push("}");
    }
  }

  for (const edge of doc.edges) {
    const src = nodeMap.get(edge.sourceId);
    const tgt = nodeMap.get(edge.targetId);
    if (!src || !tgt) continue;
    let rel = "--";
    if (edge.kind === "extends" || edge.kind === "inheritance") rel = "<|--";
    else if (edge.kind === "implements") rel = "..|>";
    else if (edge.kind === "composition") rel = "*--";
    else if (edge.kind === "aggregation") rel = "o--";
    else if (edge.kind === "dependency") rel = "..>";
    else if (edge.kind === "association") rel = "-->";
    const label = edge.label ? ` ${esc(edge.label)}` : "";
    lines.push(`"${esc(nodeLabel(src))}" ${rel} "${esc(nodeLabel(tgt))}"${label}`);
  }

  return lines;
}

function exportState(doc: DiagramDocument): string[] {
  const lines: string[] = [];

  for (const node of doc.nodes) {
    if (node.kind === "start") {
      lines.push(`[*] --> ${esc(nodeLabel(node))}`);
    } else if (node.kind === "end") {
      lines.push(`${esc(nodeLabel(node))} --> [*]`);
    } else {
      lines.push(`state "${esc(nodeLabel(node))}" as ${esc(node.id)}`);
    }
  }

  for (const group of doc.groups) {
    if (group.kind === "composite" || group.kind === "concurrent") {
      const children = (group.childIds ?? [])
        .map((cid) => doc.nodes.find((n) => n.id === cid))
        .filter((n): n is DiagramNode => n !== undefined);
      if (children.length > 0) {
        lines.push(`state "${esc(group.label ?? group.id)}" {`);
        for (const child of children) {
          lines.push(`  "${esc(nodeLabel(child))}"`);
        }
        lines.push("}");
      }
    }
  }

  const groupedNodeIds = new Set(doc.groups.flatMap((g) => g.childIds ?? []));
  for (const edge of doc.edges) {
    const src = doc.nodes.find((n) => n.id === edge.sourceId);
    const tgt = doc.nodes.find((n) => n.id === edge.targetId);
    if (!src || !tgt) continue;
    if (groupedNodeIds.has(src.id) || groupedNodeIds.has(tgt.id)) continue;
    const trigger = edge.label ? ` : ${esc(edge.label)}` : "";
    lines.push(`${esc(nodeLabel(src))} --> ${esc(nodeLabel(tgt))}${trigger}`);
  }

  return lines;
}

function exportActivity(doc: DiagramDocument): string[] {
  const lines: string[] = [];
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));

  lines.push("start");

  for (const group of doc.groups) {
    if (group.kind === "branch" || group.kind === "if") {
      const children = (group.childIds ?? [])
        .map((cid) => nodeMap.get(cid))
        .filter((n): n is DiagramNode => n !== undefined);
      const condition = group.label ?? group.id;
      lines.push(`if (${esc(condition)}) then`);
      for (const child of children) {
        if (child.kind === "activity") {
          lines.push(`  :${esc(child.label ?? child.id)};`);
        }
      }
      lines.push("endif");
    }
  }

  const groupedNodeIds = new Set(doc.groups.flatMap((g) => g.childIds ?? []));
  for (const node of doc.nodes) {
    if (node.kind === "activity" && !groupedNodeIds.has(node.id)) {
      lines.push(`:${esc(nodeLabel(node))};`);
    }
  }

  lines.push("stop");

  return lines;
}

function exportComponent(doc: DiagramDocument): string[] {
  const lines: string[] = [];
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));

  for (const node of doc.nodes) {
    if (node.kind === "interface") {
      lines.push(`interface "${esc(nodeLabel(node))}"`);
    } else if (node.kind === "component" || node.kind === "package" || node.kind === "database") {
      lines.push(`${node.kind} "${esc(nodeLabel(node))}" as ${esc(node.id)}`);
    }
  }

  for (const edge of doc.edges) {
    const src = nodeMap.get(edge.sourceId);
    const tgt = nodeMap.get(edge.targetId);
    if (!src || !tgt) continue;
    let rel = "--";
    if (edge.kind === "uses" || edge.kind === "dependency") rel = "..>";
    else if (edge.kind === "provides") rel = "<..";
    else if (edge.kind === "composition") rel = "*--";
    const label = edge.label ? ` ${esc(edge.label)}` : "";
    const srcRef = src.kind === "interface" ? `"${esc(nodeLabel(src))}"` : esc(src.id);
    const tgtRef = tgt.kind === "interface" ? `"${esc(nodeLabel(tgt))}"` : esc(tgt.id);
    lines.push(`${srcRef} ${rel} ${tgtRef}${label}`);
  }

  return lines;
}

const exporterMap: Record<string, (doc: DiagramDocument) => string[]> = {
  sequence: exportSequence,
  class: exportClass,
  state: exportState,
  activity: exportActivity,
  component: exportComponent,
};

export function exportToPlantUML(doc: DiagramDocument): string {
  const exporter = exporterMap[doc.kind];
  const body = exporter ? exporter(doc) : exportGeneric(doc);
  const lines: string[] = ["@startuml"];
  if (doc.title) {
    lines.push(`title ${esc(doc.title)}`);
  }
  lines.push(...body);
  lines.push("@enduml");
  return `${lines.join("\n")}\n`;
}

function exportGeneric(doc: DiagramDocument): string[] {
  const lines: string[] = [];
  for (const node of doc.nodes) {
    lines.push(`rectangle "${esc(nodeLabel(node))}" as ${esc(node.id)}`);
  }
  for (const edge of doc.edges) {
    const label = edge.label ? ` : ${esc(edge.label)}` : "";
    lines.push(`${esc(edge.sourceId)} ${arrowOp(edge.direction)} ${esc(edge.targetId)}${label}`);
  }
  return lines;
}
