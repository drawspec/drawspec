import type {
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramKind,
  DiagramNode,
} from "@drawspec/core";
import { labelToPlainText } from "@drawspec/core";

const DIRECTION_MAP: Record<string, string> = {
  tb: "TD",
  bt: "BT",
  lr: "LR",
  rl: "RL",
};

function escapeLabel(label: string): string {
  return label
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/\n/g, "<br/>");
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

function sanitizeId(raw: string): string {
  const sanitized = raw.replace(/[^a-zA-Z0-9_]/g, "_");
  return sanitized.length > 0 ? sanitized : "id_";
}

type IdMap = Map<string, string>;

function buildIdMap(doc: DiagramDocument): IdMap {
  const map = new Map<string, string>();
  const usedSanitized = new Map<string, number>();

  const allIds: string[] = [
    ...doc.nodes.map((n) => n.id),
    ...doc.edges.flatMap((e) => [e.sourceId, e.targetId]),
    ...doc.groups.map((g) => g.id),
  ];

  for (const rawId of allIds) {
    if (map.has(rawId)) continue;
    const base = sanitizeId(rawId);
    const count = usedSanitized.get(base) ?? 0;
    usedSanitized.set(base, count + 1);
    const unique = count === 0 ? base : `${base}_${count}`;
    map.set(rawId, unique);
  }

  return map;
}

function nodeId(node: DiagramNode, idMap: IdMap): string {
  return idMap.get(node.id) ?? sanitizeId(node.id);
}

function edgeArrow(edge: DiagramEdge): string {
  const dashed = edge.kind === "dependency" || edge.kind === "dashed";

  const dir = edge.direction;

  if (dir === "none") return dashed ? "-.-" : "---";
  if (dir === "bidirectional") return dashed ? "<-.->" : "<-->";

  return dashed ? "-.->" : "-->";
}

function edgeEndpointIds(edge: DiagramEdge, idMap: IdMap): [string, string] {
  const src = idMap.get(edge.sourceId) ?? sanitizeId(edge.sourceId);
  const tgt = idMap.get(edge.targetId) ?? sanitizeId(edge.targetId);

  return edge.direction === "backward" ? [tgt, src] : [src, tgt];
}

function hasEntries(value: Record<string, unknown> | undefined): boolean {
  return value !== undefined && Object.keys(value).length > 0;
}

function unsupportedFeatureComments(doc: DiagramDocument): string[] {
  const comments: string[] = [];

  if (doc.annotations.length > 0) {
    comments.push("%% drawspec: unsupported - annotations");
  }
  if (
    doc.styles !== undefined ||
    doc.nodes.some((node) => node.style !== undefined) ||
    doc.edges.some((edge) => edge.style !== undefined) ||
    doc.groups.some((group) => group.style !== undefined)
  ) {
    comments.push("%% drawspec: unsupported - styles");
  }
  if (
    hasEntries(doc.metadata) ||
    doc.nodes.some((node) => hasEntries(node.metadata)) ||
    doc.edges.some((edge) => hasEntries(edge.metadata)) ||
    doc.groups.some((group) => hasEntries(group.metadata))
  ) {
    comments.push("%% drawspec: unsupported - metadata");
  }
  if (doc.groups.some((group) => group.description !== undefined && group.description.length > 0)) {
    comments.push("%% drawspec: unsupported - group descriptions");
  }

  return comments;
}

function renderGraphNodes(nodes: DiagramNode[], idMap: IdMap, indent: string): string[] {
  return nodes.map((n) => {
    const id = nodeId(n, idMap);
    if (n.label) {
      return `${indent}${id}["${escapeLabel(labelToPlainText(n.label))}"]`;
    }
    return `${indent}${id}`;
  });
}

function renderGraphEdges(
  edges: DiagramEdge[],
  nodes: DiagramNode[],
  idMap: IdMap,
  indent: string
): string[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  return edges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    .map((e) => {
      const [src, tgt] = edgeEndpointIds(e, idMap);
      const arrow = edgeArrow(e);
      if (e.label) {
        return `${indent}${src} ${arrow}|${escapeLabel(labelToPlainText(e.label))}| ${tgt}`;
      }
      return `${indent}${src} ${arrow} ${tgt}`;
    });
}

function renderGroupDeclaration(group: DiagramGroup, idMap: IdMap, indent: string): string {
  const gid = idMap.get(group.id) ?? sanitizeId(group.id);
  const label = group.label ? `["${escapeLabel(labelToPlainText(group.label))}"]` : "";
  return `${indent}subgraph ${gid}${label}`;
}

function renderGraph(doc: DiagramDocument): string {
  const idMap = buildIdMap(doc);
  const direction = DIRECTION_MAP[doc.layout?.direction ?? "tb"] ?? "TD";
  const lines: string[] = [`graph ${direction}`, ...unsupportedFeatureComments(doc)];
  const indent = "  ";

  const ungrouped = doc.nodes.filter((n) => !doc.groups.some((g) => g.childIds?.includes(n.id)));

  for (const node of ungrouped) {
    lines.push(...renderGraphNodes([node], idMap, indent));
  }

  for (const group of doc.groups) {
    lines.push(renderGroupDeclaration(group, idMap, indent));
    const grouped = doc.nodes.filter((n) => group.childIds?.includes(n.id));
    for (const node of grouped) {
      lines.push(...renderGraphNodes([node], idMap, indent + indent));
    }
    lines.push(`${indent}end`);
  }

  lines.push(...renderGraphEdges(doc.edges, doc.nodes, idMap, indent));

  return lines.join("\n");
}

function renderFlowchart(doc: DiagramDocument): string {
  const idMap = buildIdMap(doc);
  const direction = DIRECTION_MAP[doc.layout?.direction ?? "tb"] ?? "TD";
  const lines: string[] = [`flowchart ${direction}`, ...unsupportedFeatureComments(doc)];
  const indent = "  ";

  for (const node of doc.nodes) {
    lines.push(...renderGraphNodes([node], idMap, indent));
  }

  lines.push(...renderGraphEdges(doc.edges, doc.nodes, idMap, indent));

  return lines.join("\n");
}

function renderSequence(doc: DiagramDocument): string {
  const idMap = buildIdMap(doc);
  const lines: string[] = ["sequenceDiagram", ...unsupportedFeatureComments(doc)];

  if (doc.groups.length > 0) {
    lines.push("  %% drawspec: unsupported - sequence fragments");
  }

  const nodeIds = new Set(doc.nodes.map((n) => n.id));

  for (const node of doc.nodes) {
    const label = node.label === undefined ? node.id : labelToPlainText(node.label);
    lines.push(`  participant ${nodeId(node, idMap)} as ${escapeLabel(label)}`);
  }

  for (const edge of doc.edges) {
    if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) {
      const missingId = !nodeIds.has(edge.sourceId) ? edge.sourceId : edge.targetId;
      lines.push(`  %% drawspec: unsupported - dangling reference to "${missingId}"`);
      continue;
    }
    const src = idMap.get(edge.sourceId) ?? sanitizeId(edge.sourceId);
    const tgt = idMap.get(edge.targetId) ?? sanitizeId(edge.targetId);
    const arrow = edge.kind === "dashed" || edge.kind === "return" ? "-->>" : "->>";
    if (edge.label) {
      lines.push(`  ${src}${arrow}${tgt}: ${escapeLabel(labelToPlainText(edge.label))}`);
    } else {
      lines.push(`  ${src}${arrow}${tgt}`);
    }
  }

  return lines.join("\n");
}

function renderClassDiagram(doc: DiagramDocument): string {
  const idMap = buildIdMap(doc);
  const lines: string[] = ["classDiagram", ...unsupportedFeatureComments(doc)];

  for (const node of doc.nodes) {
    lines.push(`  class ${nodeId(node, idMap)} {`);
    if (node.description) {
      for (const line of node.description.split("\n")) {
        lines.push(`    ${escapeLabel(line)}`);
      }
    }
    lines.push("  }");
  }

  for (const edge of doc.edges) {
    const src = idMap.get(edge.sourceId) ?? sanitizeId(edge.sourceId);
    const tgt = idMap.get(edge.targetId) ?? sanitizeId(edge.targetId);
    const arrow =
      edge.kind === "inheritance" || edge.kind === "extends"
        ? " --|> "
        : edge.kind === "implements"
          ? " ..|> "
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
  const idMap = buildIdMap(doc);
  const lines: string[] = ["stateDiagram-v2", ...unsupportedFeatureComments(doc)];

  for (const node of doc.nodes) {
    const id = nodeId(node, idMap);
    const label = node.label === undefined ? undefined : labelToPlainText(node.label);
    if (label !== undefined && label !== node.id) {
      lines.push(`  state "${escapeLabel(label)}" as ${id}`);
    } else {
      lines.push(`  state ${id}`);
    }
  }

  for (const edge of doc.edges) {
    const src = idMap.get(edge.sourceId) ?? sanitizeId(edge.sourceId);
    const tgt = idMap.get(edge.targetId) ?? sanitizeId(edge.targetId);
    if (edge.label) {
      lines.push(`  ${src} --> ${tgt}: ${escapeLabel(labelToPlainText(edge.label))}`);
    } else {
      lines.push(`  ${src} --> ${tgt}`);
    }
  }

  return lines.join("\n");
}

function renderErDiagram(doc: DiagramDocument): string {
  const idMap = buildIdMap(doc);
  const lines: string[] = ["erDiagram", ...unsupportedFeatureComments(doc)];

  for (const edge of doc.edges) {
    const src = idMap.get(edge.sourceId) ?? sanitizeId(edge.sourceId);
    const tgt = idMap.get(edge.targetId) ?? sanitizeId(edge.targetId);
    const rel =
      edge.kind === "one-to-one"
        ? "||--||"
        : edge.kind === "one-to-many"
          ? "||--o{"
          : edge.kind === "many-to-many"
            ? "}o--o{"
            : "||--o{";
    if (edge.label) {
      lines.push(`  ${src} ${rel} ${tgt}: "${escapeLabel(labelToPlainText(edge.label))}"`);
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
