import type {
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramKind,
  DiagramNode,
} from "@drawspec/core";

const DIRECTION_MAP: Record<string, string> = {
  tb: "TD",
  bt: "BT",
  lr: "LR",
  rl: "RL",
};

function escapeLabel(label: string): string {
  return label.replace(/"/g, "#quot;").replace(/\n/g, "<br/>");
}

function isGraphLike(kind: DiagramKind): boolean {
  return (
    kind === "graph" ||
    kind === "architecture" ||
    kind === "component" ||
    kind === "deployment" ||
    kind === "use-case" ||
    kind === "object" ||
    kind === "timing"
  );
}

function isFlowchart(kind: DiagramKind): boolean {
  return kind === "activity";
}

function nodeId(node: DiagramNode): string {
  return node.id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function renderGraphNodes(nodes: DiagramNode[], indent: string): string[] {
  return nodes.map((n) => {
    const id = nodeId(n);
    if (n.label) {
      return `${indent}${id}["${escapeLabel(n.label)}"]`;
    }
    return `${indent}${id}`;
  });
}

function renderGraphEdges(edges: DiagramEdge[], nodes: DiagramNode[], indent: string): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  return edges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    .map((e) => {
      const src = nodeId({ id: e.sourceId } as DiagramNode);
      const tgt = nodeId({ id: e.targetId } as DiagramNode);
      const arrow = edgeArrow(e);
      if (e.label) {
        return `${indent}${src} ${arrow}|${escapeLabel(e.label)}| ${tgt}`;
      }
      return `${indent}${src} ${arrow} ${tgt}`;
    });
}

function edgeArrow(edge: DiagramEdge): string {
  switch (edge.kind) {
    case "dependency":
    case "dashed":
      return "-.->";
    case "bidirectional":
    case "association":
      return "<-->";
    case "none":
      return "---";
    default:
      return "-->";
  }
}

function renderGroupDeclaration(group: DiagramGroup, indent: string): string {
  const gid = group.id.replace(/[^a-zA-Z0-9_]/g, "_");
  const label = group.label ? `["${escapeLabel(group.label)}"]` : "";
  return `${indent}subgraph ${gid}${label}`;
}

function renderGraph(doc: DiagramDocument): string {
  const direction = DIRECTION_MAP[doc.layout?.direction ?? "tb"] ?? "TD";
  const lines: string[] = [`graph ${direction}`];
  const indent = "  ";

  const ungrouped = doc.nodes.filter((n) => !doc.groups.some((g) => g.childIds?.includes(n.id)));

  for (const node of ungrouped) {
    lines.push(...renderGraphNodes([node], indent));
  }

  for (const group of doc.groups) {
    lines.push(renderGroupDeclaration(group, indent));
    const grouped = doc.nodes.filter((n) => group.childIds?.includes(n.id));
    for (const node of grouped) {
      lines.push(...renderGraphNodes([node], indent + indent));
    }
    lines.push(`${indent}end`);
  }

  lines.push(...renderGraphEdges(doc.edges, doc.nodes, indent));

  return lines.join("\n");
}

function renderFlowchart(doc: DiagramDocument): string {
  const direction = DIRECTION_MAP[doc.layout?.direction ?? "tb"] ?? "TD";
  const lines: string[] = [`flowchart ${direction}`];
  const indent = "  ";

  for (const node of doc.nodes) {
    lines.push(...renderGraphNodes([node], indent));
  }

  lines.push(...renderGraphEdges(doc.edges, doc.nodes, indent));

  return lines.join("\n");
}

function renderSequence(doc: DiagramDocument): string {
  const lines: string[] = ["sequenceDiagram"];

  for (const node of doc.nodes) {
    const label = node.label ?? node.id;
    lines.push(`  participant ${nodeId(node)} as ${escapeLabel(label)}`);
  }

  for (const edge of doc.edges) {
    const src = nodeId({ id: edge.sourceId } as DiagramNode);
    const tgt = nodeId({ id: edge.targetId } as DiagramNode);
    const arrow = edge.kind === "dashed" || edge.kind === "return" ? "-->>" : "->>";
    if (edge.label) {
      lines.push(`  ${src}${arrow}${tgt}: ${escapeLabel(edge.label)}`);
    } else {
      lines.push(`  ${src}${arrow}${tgt}`);
    }
  }

  return lines.join("\n");
}

function renderClassDiagram(doc: DiagramDocument): string {
  const lines: string[] = ["classDiagram"];

  for (const node of doc.nodes) {
    lines.push(`  class ${nodeId(node)} {`);
    if (node.description) {
      for (const line of node.description.split("\n")) {
        lines.push(`    ${escapeLabel(line)}`);
      }
    }
    lines.push("  }");
  }

  for (const edge of doc.edges) {
    const src = nodeId({ id: edge.sourceId } as DiagramNode);
    const tgt = nodeId({ id: edge.targetId } as DiagramNode);
    const arrow =
      edge.kind === "inheritance"
        ? " --|> "
        : edge.kind === "composition"
          ? " *-- "
          : edge.kind === "aggregation"
            ? " o-- "
            : " --> ";
    lines.push(`  ${src}${arrow}${tgt}`);
  }

  return lines.join("\n");
}

function renderStateDiagram(doc: DiagramDocument): string {
  const lines: string[] = ["stateDiagram-v2"];

  for (const node of doc.nodes) {
    const id = nodeId(node);
    if (node.label && node.label !== node.id) {
      lines.push(`  state "${escapeLabel(node.label)}" as ${id}`);
    } else {
      lines.push(`  state ${id}`);
    }
  }

  for (const edge of doc.edges) {
    const src = nodeId({ id: edge.sourceId } as DiagramNode);
    const tgt = nodeId({ id: edge.targetId } as DiagramNode);
    if (edge.label) {
      lines.push(`  ${src} --> ${tgt}: ${escapeLabel(edge.label)}`);
    } else {
      lines.push(`  ${src} --> ${tgt}`);
    }
  }

  return lines.join("\n");
}

function renderErDiagram(doc: DiagramDocument): string {
  const lines: string[] = ["erDiagram"];

  for (const edge of doc.edges) {
    const src = nodeId({ id: edge.sourceId } as DiagramNode);
    const tgt = nodeId({ id: edge.targetId } as DiagramNode);
    const rel =
      edge.kind === "one-to-one"
        ? "||--||"
        : edge.kind === "one-to-many"
          ? "||--o{"
          : edge.kind === "many-to-many"
            ? "}o--o{"
            : "||--o{";
    if (edge.label) {
      lines.push(`  ${src} ${rel} ${tgt}: "${escapeLabel(edge.label)}"`);
    } else {
      lines.push(`  ${src} ${rel} ${tgt}`);
    }
  }

  return lines.join("\n");
}

export function exportToMermaid(doc: DiagramDocument): string {
  const kind = doc.kind;
  if (isFlowchart(kind)) {
    return renderFlowchart(doc);
  }
  if (isGraphLike(kind)) {
    return renderGraph(doc);
  }
  if (kind === "sequence") {
    return renderSequence(doc);
  }
  if (kind === "class") {
    return renderClassDiagram(doc);
  }
  if (kind === "state") {
    return renderStateDiagram(doc);
  }
  if (kind === "er") {
    return renderErDiagram(doc);
  }

  return renderGraph(doc);
}
