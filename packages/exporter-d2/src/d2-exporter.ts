import type {
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  LayoutSpec,
} from "@drawspec/core";

const D2_DIRECTION_MAP: Record<string, string> = {
  tb: "down",
  bt: "up",
  lr: "right",
  rl: "left",
};

const D2_SHAPE_MAP: Record<string, string> = {
  rectangle: "rectangle",
  circle: "circle",
  diamond: "diamond",
  cylinder: "cylinder",
  hexagon: "hexagon",
  cloud: "cloud",
  oval: "oval",
  person: "person",
  code: "code",
  class: "class",
  sql_table: "sql_table",
  image: "image",
};

function escapeLabel(label: string): string {
  if (/[\n:{}"]/u.test(label)) {
    return `"${label.replace(/"/gu, '\\"')}"`;
  }
  return label;
}

function d2Id(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/gu, "_");
}

function formatDirection(layout: LayoutSpec | undefined): string | undefined {
  if (!layout?.direction) return undefined;
  return D2_DIRECTION_MAP[layout.direction];
}

function formatNode(node: DiagramNode, indent: string): string[] {
  const lines: string[] = [];
  const id = d2Id(node.id);
  if (node.label) {
    lines.push(`${indent}${id}: ${escapeLabel(node.label)}`);
  } else {
    lines.push(`${indent}${id}`);
  }
  const kind = node.kind;
  if (kind && kind !== "default" && D2_SHAPE_MAP[kind]) {
    lines.push(`${indent}${id}.shape: ${D2_SHAPE_MAP[kind]}`);
  }
  if (node.description) {
    lines.push(`${indent}${id}.tooltip: ${escapeLabel(node.description)}`);
  }
  return lines;
}

function d2Arrow(direction: DiagramEdge["direction"]): string {
  switch (direction) {
    case "none":
      return "--";
    case "backward":
      return "<-";
    case "bidirectional":
      return "<>";
    default:
      return "->";
  }
}

function formatEdge(edge: DiagramEdge, indent: string): string[] {
  const lines: string[] = [];
  const src = d2Id(edge.sourceId);
  const tgt = d2Id(edge.targetId);
  const arrow = d2Arrow(edge.direction);
  if (edge.label) {
    lines.push(`${indent}${src} ${arrow} ${tgt}: ${escapeLabel(edge.label)}`);
  } else {
    lines.push(`${indent}${src} ${arrow} ${tgt}`);
  }
  return lines;
}

function collectChildNodes(group: DiagramGroup, nodes: DiagramNode[]): DiagramNode[] {
  if (!group.childIds) return [];
  const childIdSet = new Set(group.childIds);
  return nodes.filter((n) => childIdSet.has(n.id));
}

function formatGroup(
  group: DiagramGroup,
  nodes: DiagramNode[],
  allGroups: DiagramGroup[],
  indent: string
): string[] {
  const lines: string[] = [];
  const id = d2Id(group.id);
  lines.push(`${indent}${id}: {`);
  const inner = `${indent}  `;
  for (const child of collectChildNodes(group, nodes)) {
    lines.push(...formatNode(child, inner));
  }
  for (const child of getChildGroups(group, allGroups)) {
    lines.push(...formatGroup(child, nodes, allGroups, inner));
  }
  lines.push(`${indent}}`);
  return lines;
}

function getChildGroups(parent: DiagramGroup, allGroups: DiagramGroup[]): DiagramGroup[] {
  return allGroups.filter((g) => g.parentId === parent.id);
}

function getRootGroups(groups: DiagramGroup[]): DiagramGroup[] {
  return groups.filter((g) => !g.parentId);
}

function getRootNodes(nodes: DiagramNode[], groups: DiagramGroup[]): DiagramNode[] {
  const groupedNodeIds = new Set<string>();
  for (const group of groups) {
    if (group.childIds) {
      for (const id of group.childIds) {
        groupedNodeIds.add(id);
      }
    }
  }
  return nodes.filter((n) => !groupedNodeIds.has(n.id));
}

function getRootEdges(edges: DiagramEdge[]): DiagramEdge[] {
  return edges;
}

export function exportToD2(doc: DiagramDocument): string {
  const lines: string[] = [];

  const dir = formatDirection(doc.layout);
  if (dir) {
    lines.push(`direction: ${dir}`);
  }

  const rootNodes = getRootNodes(doc.nodes, doc.groups);
  const rootEdges = getRootEdges(doc.edges);
  const rootGroups = getRootGroups(doc.groups);

  for (const group of rootGroups) {
    lines.push(...formatGroup(group, doc.nodes, doc.groups, ""));
  }

  for (const node of rootNodes) {
    lines.push(...formatNode(node, ""));
  }

  for (const edge of rootEdges) {
    lines.push(...formatEdge(edge, ""));
  }

  return `${lines.join("\n")}\n`;
}
