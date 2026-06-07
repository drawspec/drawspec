import type { DiagramDocument, DiagramEdge, DiagramNode } from "@drawspec/core";
import { labelToPlainText } from "@drawspec/core";

function nodeLabel(node: DiagramNode): string {
  return node.label === undefined ? node.id : labelToPlainText(node.label);
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
      lines.push(`${kw} "${esc(nodeLabel(node))}" as ${esc(node.id)}`);
    }
  }

  for (const group of doc.groups) {
    if (
      group.kind === "alt" ||
      group.kind === "opt" ||
      group.kind === "loop" ||
      group.kind === "par"
    ) {
      lines.push(
        `${group.kind} ${esc(group.label === undefined ? group.id : labelToPlainText(group.label))}`
      );
      const childEdges = (group.childIds ?? [])
        .map((cid) => doc.edges.find((e) => e.id === cid))
        .filter((e): e is DiagramEdge => e !== undefined);
      for (const edge of childEdges) {
        const label = edge.label ? ` : ${esc(labelToPlainText(edge.label))}` : "";
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
      const label = edge.label ? ` : ${esc(labelToPlainText(edge.label))}` : "";
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
    let reverse = false;
    if (edge.kind === "extends" || edge.kind === "inheritance") {
      rel = "<|--";
      reverse = true;
    } else if (edge.kind === "implements") {
      rel = "<|..";
      reverse = true;
    } else if (edge.kind === "composition") rel = "*--";
    else if (edge.kind === "aggregation") rel = "o--";
    else if (edge.kind === "dependency") rel = "..>";
    else if (edge.kind === "association") rel = "-->";
    const label = edge.label ? ` ${esc(labelToPlainText(edge.label))}` : "";
    const left = reverse ? tgt : src;
    const right = reverse ? src : tgt;
    lines.push(`"${esc(nodeLabel(left))}" ${rel} "${esc(nodeLabel(right))}"${label}`);
  }

  return lines;
}

function exportState(doc: DiagramDocument): string[] {
  const lines: string[] = [];
  const nestedStateIds = new Set(
    doc.groups
      .filter((group) => group.kind === "composite" || group.kind === "concurrent")
      .flatMap((group) => group.childIds ?? [])
  );

  for (const node of doc.nodes) {
    if (node.kind === "start" || node.kind === "end") continue;
    if (nestedStateIds.has(node.id)) continue;
    lines.push(`state "${esc(nodeLabel(node))}" as ${esc(node.id)}`);
  }

  for (const group of doc.groups) {
    if (group.kind === "composite" || group.kind === "concurrent") {
      const children = (group.childIds ?? [])
        .map((cid) => doc.nodes.find((n) => n.id === cid))
        .filter((n): n is DiagramNode => n !== undefined);
      if (children.length > 0) {
        lines.push(
          `state "${esc(group.label === undefined ? group.id : labelToPlainText(group.label))}" {`
        );
        for (const child of children) {
          if (child.kind === "start" || child.kind === "end") continue;
          lines.push(`  state "${esc(nodeLabel(child))}" as ${esc(child.id)}`);
        }
        lines.push("}");
      }
    }
  }

  function stateRef(id: string): string {
    const node = doc.nodes.find((n) => n.id === id);
    if (node && (node.kind === "start" || node.kind === "end")) return "[*]";
    if (!node) return esc(id);
    return esc(node.id);
  }

  for (const edge of doc.edges) {
    const src = doc.nodes.find((n) => n.id === edge.sourceId);
    const tgt = doc.nodes.find((n) => n.id === edge.targetId);
    if (!src || !tgt) continue;
    const trigger = edge.label ? ` : ${esc(labelToPlainText(edge.label))}` : "";
    lines.push(`${stateRef(src.id)} --> ${stateRef(tgt.id)}${trigger}`);
  }

  return lines;
}

function exportActivity(doc: DiagramDocument): string[] {
  const lines: string[] = [];
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));

  const activityNodes = doc.nodes.filter((n) => n.kind === "activity");
  if (activityNodes.length === 0) return lines;

  const groupedNodeIds = new Set(doc.groups.flatMap((g) => g.childIds ?? []));
  const nodeOrder = new Map(doc.nodes.map((n, i) => [n.id, i]));
  const groupOrder = new Map(doc.groups.map((g, i) => [g.id, i]));

  const orderedGroups = [...doc.groups]
    .filter((g) => g.kind === "branch" || g.kind === "if")
    .sort((a, b) => (groupOrder.get(a.id) ?? 0) - (groupOrder.get(b.id) ?? 0));

  lines.push("start");

  type Segment =
    | { type: "activity"; nodeId: string; order: number }
    | { type: "group"; group: (typeof doc.groups)[0]; order: number };
  const segments: Segment[] = [];

  for (const node of activityNodes) {
    if (groupedNodeIds.has(node.id)) continue;
    segments.push({ type: "activity", nodeId: node.id, order: nodeOrder.get(node.id) ?? 0 });
  }

  for (const group of orderedGroups) {
    const minChildOrder = Math.min(...(group.childIds ?? []).map((cid) => nodeOrder.get(cid) ?? 0));
    segments.push({ type: "group", group, order: minChildOrder });
  }

  segments.sort((a, b) => a.order - b.order);

  for (const seg of segments) {
    if (seg.type === "activity") {
      const node = nodeMap.get(seg.nodeId);
      if (node) lines.push(`:${esc(nodeLabel(node))};`);
    } else {
      const group = seg.group;
      const children = (group.childIds ?? [])
        .map((cid) => nodeMap.get(cid))
        .filter((n): n is DiagramNode => n !== undefined);
      const condition = group.label === undefined ? group.id : labelToPlainText(group.label);
      lines.push(`if (${esc(condition)}) then (yes)`);
      for (const child of children) {
        lines.push(`  :${esc(nodeLabel(child))};`);
      }
      lines.push("else (no)");
      lines.push("endif");
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
    const label = edge.label ? ` ${esc(labelToPlainText(edge.label))}` : "";
    const srcRef = src.kind === "interface" ? `"${esc(nodeLabel(src))}"` : esc(src.id);
    const tgtRef = tgt.kind === "interface" ? `"${esc(nodeLabel(tgt))}"` : esc(tgt.id);
    lines.push(`${srcRef} ${rel} ${tgtRef}${label}`);
  }

  return lines;
}

function exportArchitecture(doc: DiagramDocument): string[] {
  const lines: string[] = [
    "!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml",
  ];
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));

  function c4Macro(kind: string): string {
    switch (kind) {
      case "person":
        return "Person";
      case "softwareSystem":
        return "System";
      case "container":
        return "Container";
      case "database":
        return "ContainerDb";
      default:
        return "Rectangle";
    }
  }

  const groupedNodeIds = new Set<string>();
  for (const group of doc.groups) {
    if (group.kind === "softwareSystem") {
      const children = (group.childIds ?? [])
        .map((cid) => nodeMap.get(cid))
        .filter((n): n is DiagramNode => n !== undefined);
      if (children.length > 0) {
        lines.push(
          `System(${esc(group.id)}, "${esc(group.label === undefined ? group.id : labelToPlainText(group.label))}") {`
        );
        for (const child of children) {
          groupedNodeIds.add(child.id);
          const macro = c4Macro(child.kind);
          const desc = child.description ? `, "${esc(child.description)}"` : "";
          lines.push(`  ${macro}(${esc(child.id)}, "${esc(nodeLabel(child))}"${desc})`);
        }
        lines.push("}");
      }
    }
  }

  for (const node of doc.nodes) {
    if (groupedNodeIds.has(node.id)) continue;
    const macro = c4Macro(node.kind);
    const desc = node.description ? `, "${esc(node.description)}"` : "";
    lines.push(`${macro}(${esc(node.id)}, "${esc(nodeLabel(node))}"${desc})`);
  }

  for (const edge of doc.edges) {
    const label = edge.label ? `"${esc(labelToPlainText(edge.label))}"` : "";
    lines.push(`Rel(${esc(edge.sourceId)}, ${esc(edge.targetId)}, ${label})`);
  }

  return lines;
}

function exportDeployment(doc: DiagramDocument): string[] {
  const lines: string[] = [];

  function kindKeyword(kind: string): string {
    switch (kind) {
      case "deployment-node":
        return "node";
      case "artifact":
        return "artifact";
      case "infrastructure-node":
        return "cloud";
      default:
        return "node";
    }
  }

  const childrenMap = new Map<string, DiagramNode[]>();
  const topLevelNodes: DiagramNode[] = [];
  for (const node of doc.nodes) {
    if (node.parentId) {
      const siblings = childrenMap.get(node.parentId) ?? [];
      siblings.push(node);
      childrenMap.set(node.parentId, siblings);
    } else {
      topLevelNodes.push(node);
    }
  }

  function emitNode(node: DiagramNode, indent: string): void {
    const kw = kindKeyword(node.kind);
    const children = childrenMap.get(node.id);
    if (children && children.length > 0) {
      lines.push(`${indent}${kw} "${esc(nodeLabel(node))}" as ${esc(node.id)} {`);
      for (const child of children) {
        emitNode(child, `${indent}  `);
      }
      lines.push(`${indent}}`);
    } else {
      lines.push(`${indent}${kw} "${esc(nodeLabel(node))}" as ${esc(node.id)}`);
    }
  }

  for (const node of topLevelNodes) {
    emitNode(node, "");
  }

  for (const edge of doc.edges) {
    const label = edge.label ? ` : ${esc(labelToPlainText(edge.label))}` : "";
    lines.push(`${esc(edge.sourceId)} ${arrowOp(edge.direction)} ${esc(edge.targetId)}${label}`);
  }

  return lines;
}

function exportGraph(doc: DiagramDocument): string[] {
  const lines: string[] = [];
  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));
  const groupMap = new Map(doc.groups.map((g) => [g.id, g]));

  const groupChildren = new Map<string, string[]>();
  const topLevelGroups: string[] = [];
  for (const group of doc.groups) {
    if (group.parentId && groupMap.has(group.parentId)) {
      const siblings = groupChildren.get(group.parentId) ?? [];
      siblings.push(group.id);
      groupChildren.set(group.parentId, siblings);
    } else {
      topLevelGroups.push(group.id);
    }
  }

  const groupedNodeIds = new Set<string>();

  function emitGroup(groupId: string, indent: string): void {
    const group = groupMap.get(groupId);
    if (!group) return;
    const childNodes = (group.childIds ?? [])
      .map((cid) => nodeMap.get(cid))
      .filter((n): n is DiagramNode => n !== undefined);
    const childGroupIds = groupChildren.get(groupId) ?? [];

    if (childNodes.length === 0 && childGroupIds.length === 0) return;

    for (const child of childNodes) {
      groupedNodeIds.add(child.id);
    }

    lines.push(
      `${indent}package "${esc(group.label === undefined ? group.id : labelToPlainText(group.label))}" {`
    );
    for (const child of childNodes) {
      lines.push(`${indent}  rectangle "${esc(nodeLabel(child))}" as ${esc(child.id)}`);
    }
    for (const childGroupId of childGroupIds) {
      emitGroup(childGroupId, `${indent}  `);
    }
    lines.push(`${indent}}`);
  }

  for (const groupId of topLevelGroups) {
    emitGroup(groupId, "");
  }

  for (const node of doc.nodes) {
    if (groupedNodeIds.has(node.id)) continue;
    lines.push(`rectangle "${esc(nodeLabel(node))}" as ${esc(node.id)}`);
  }

  for (const edge of doc.edges) {
    const label = edge.label ? ` : ${esc(labelToPlainText(edge.label))}` : "";
    lines.push(`${esc(edge.sourceId)} ${arrowOp(edge.direction)} ${esc(edge.targetId)}${label}`);
  }

  return lines;
}

const exporterMap: Record<string, (doc: DiagramDocument) => string[]> = {
  sequence: exportSequence,
  class: exportClass,
  state: exportState,
  activity: exportActivity,
  component: exportComponent,
  architecture: exportArchitecture,
  deployment: exportDeployment,
  graph: exportGraph,
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
    const label = edge.label ? ` : ${esc(labelToPlainText(edge.label))}` : "";
    lines.push(`${esc(edge.sourceId)} ${arrowOp(edge.direction)} ${esc(edge.targetId)}${label}`);
  }
  return lines;
}
