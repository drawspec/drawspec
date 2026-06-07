import type {
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  LayoutSpec,
} from "@drawspec/core";
import { labelToPlainText } from "@drawspec/core";

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

function sanitizeIdPart(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/gu, "_");
}

function buildIdMap(ids: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const id of ids) {
    const base = sanitizeIdPart(id);
    const count = seen.get(base);
    if (count === undefined) {
      seen.set(base, 1);
      map.set(id, base);
    } else {
      seen.set(base, count + 1);
      map.set(id, `${base}_${count}`);
    }
  }
  return map;
}

function formatDirection(layout: LayoutSpec | undefined): string | undefined {
  if (!layout?.direction) return undefined;
  return D2_DIRECTION_MAP[layout.direction];
}

function formatNode(node: DiagramNode, idMap: Map<string, string>, indent: string): string[] {
  const lines: string[] = [];
  const id = idMap.get(node.id) ?? sanitizeIdPart(node.id);
  if (node.label) {
    lines.push(`${indent}${id}: ${escapeLabel(labelToPlainText(node.label))}`);
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

function formatEdge(edge: DiagramEdge, idMap: Map<string, string>, indent: string): string[] {
  const lines: string[] = [];
  const src = idMap.get(edge.sourceId) ?? sanitizeIdPart(edge.sourceId);
  const tgt = idMap.get(edge.targetId) ?? sanitizeIdPart(edge.targetId);
  const arrow = d2Arrow(edge.direction);
  if (edge.label) {
    lines.push(`${indent}${src} ${arrow} ${tgt}: ${escapeLabel(labelToPlainText(edge.label))}`);
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
  idMap: Map<string, string>,
  indent: string
): string[] {
  const lines: string[] = [];
  const id = idMap.get(group.id) ?? sanitizeIdPart(group.id);
  const label = group.label ? ` ${escapeLabel(labelToPlainText(group.label))}` : "";
  lines.push(`${indent}${id}:${label} {`);
  const inner = `${indent}  `;
  if (group.description) {
    lines.push(`${inner}tooltip: ${escapeLabel(group.description)}`);
  }
  for (const child of collectChildNodes(group, nodes)) {
    lines.push(...formatNode(child, idMap, inner));
  }
  for (const child of getChildGroups(group, allGroups)) {
    lines.push(...formatGroup(child, nodes, allGroups, idMap, inner));
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
  const parentNodeIds = new Set<string>();
  for (const node of nodes) {
    if (node.parentId) {
      parentNodeIds.add(node.id);
    }
  }
  return nodes.filter((n) => !groupedNodeIds.has(n.id) && !parentNodeIds.has(n.id));
}

function getNodeChildren(parentId: string, nodes: DiagramNode[]): DiagramNode[] {
  return nodes.filter((n) => n.parentId === parentId);
}

function formatNodeWithChildren(
  node: DiagramNode,
  nodes: DiagramNode[],
  idMap: Map<string, string>,
  indent: string
): string[] {
  const lines: string[] = [];
  const id = idMap.get(node.id) ?? sanitizeIdPart(node.id);
  const children = getNodeChildren(node.id, nodes);
  if (children.length > 0) {
    const label = node.label ? ` ${escapeLabel(labelToPlainText(node.label))}` : "";
    lines.push(`${indent}${id}:${label} {`);
    const inner = `${indent}  `;
    if (node.description) {
      lines.push(`${inner}tooltip: ${escapeLabel(node.description)}`);
    }
    for (const child of children) {
      lines.push(...formatNodeWithChildren(child, nodes, idMap, inner));
    }
    lines.push(`${indent}}`);
  } else {
    lines.push(...formatNode(node, idMap, indent));
  }
  return lines;
}

function getRootEdges(edges: DiagramEdge[]): DiagramEdge[] {
  return edges;
}

export function exportToD2(doc: DiagramDocument): string {
  const lines: string[] = [];

  const uniqueIds = new Set<string>();
  for (const n of doc.nodes) uniqueIds.add(n.id);
  for (const g of doc.groups) uniqueIds.add(g.id);
  for (const e of doc.edges) {
    uniqueIds.add(e.sourceId);
    uniqueIds.add(e.targetId);
  }
  const idMap = buildIdMap([...uniqueIds]);

  const dir = formatDirection(doc.layout);
  if (dir) {
    lines.push(`direction: ${dir}`);
  }

  const rootNodes = getRootNodes(doc.nodes, doc.groups);
  const rootEdges = getRootEdges(doc.edges);
  const rootGroups = getRootGroups(doc.groups);

  for (const group of rootGroups) {
    lines.push(...formatGroup(group, doc.nodes, doc.groups, idMap, ""));
  }

  for (const node of rootNodes) {
    lines.push(...formatNodeWithChildren(node, doc.nodes, idMap, ""));
  }

  for (const edge of rootEdges) {
    lines.push(...formatEdge(edge, idMap, ""));
  }

  return `${lines.join("\n")}\n`;
}
