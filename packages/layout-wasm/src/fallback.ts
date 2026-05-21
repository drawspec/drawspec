import type { WasmBridge, WasmGraphInput, WasmLayoutResult } from "./wasm-bridge";

function sortedById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function computeRanks(
  nodeIds: string[],
  edges: Array<{ sourceId: string; targetId: string }>
): Record<string, number> {
  const rank: Record<string, number> = {};
  for (const id of nodeIds) {
    rank[id] = 0;
  }

  const usefulEdges = edges.filter(
    (e) =>
      e.sourceId !== e.targetId && rank[e.sourceId] !== undefined && rank[e.targetId] !== undefined
  );

  for (let pass = 0; pass < nodeIds.length; pass++) {
    let changed = false;
    for (const edge of usefulEdges) {
      const candidate = (rank[edge.sourceId] ?? 0) + 1;
      if (candidate > (rank[edge.targetId] ?? 0)) {
        rank[edge.targetId] = candidate;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return rank;
}

function barycenterOrder(
  nodesAtRank: string[],
  edges: Array<{ sourceId: string; targetId: string }>,
  positions: Record<string, number>
): string[] {
  const nodeSet = new Set(nodesAtRank);
  const scores: Record<string, number> = {};

  for (const nodeId of nodesAtRank) {
    const neighbors: number[] = [];
    for (const edge of edges) {
      if (edge.targetId === nodeId && nodeSet.has(edge.sourceId) === false) {
        const pos = positions[edge.sourceId];
        if (pos !== undefined) neighbors.push(pos);
      }
      if (edge.sourceId === nodeId && nodeSet.has(edge.targetId) === false) {
        const pos = positions[edge.targetId];
        if (pos !== undefined) neighbors.push(pos);
      }
    }
    scores[nodeId] =
      neighbors.length === 0 ? 0 : neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
  }

  return [...nodesAtRank].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0));
}

function computeEdgeRoutes(
  input: WasmGraphInput,
  nodePositions: Record<string, { x: number; y: number; width: number; height: number }>
): Array<{ id: string; waypoints: Array<{ x: number; y: number }> }> {
  const { direction } = input;
  const isHorizontal = direction === "LR" || direction === "RL";

  return sortedById(input.edges).map((edge) => {
    const src = nodePositions[edge.sourceId];
    const tgt = nodePositions[edge.targetId];
    if (src === undefined || tgt === undefined) {
      return { id: edge.id, waypoints: [] };
    }

    const srcCx = src.x + src.width / 2;
    const srcCy = src.y + src.height / 2;
    const tgtCx = tgt.x + tgt.width / 2;
    const tgtCy = tgt.y + tgt.height / 2;

    if (isHorizontal) {
      if (direction === "RL") {
        const exitX = src.x;
        const entryX = tgt.x + tgt.width;
        const midPx = (exitX + entryX) / 2;
        return {
          id: edge.id,
          waypoints: [
            { x: exitX, y: srcCy },
            { x: midPx, y: srcCy },
            { x: midPx, y: tgtCy },
            { x: entryX, y: tgtCy },
          ],
        };
      }
      const exitX = src.x + src.width;
      const entryX = tgt.x;
      const midPx = (exitX + entryX) / 2;
      return {
        id: edge.id,
        waypoints: [
          { x: exitX, y: srcCy },
          { x: midPx, y: srcCy },
          { x: midPx, y: tgtCy },
          { x: entryX, y: tgtCy },
        ],
      };
    }

    if (direction === "BT") {
      const exitY = src.y;
      const entryY = tgt.y + tgt.height;
      const midPy = (exitY + entryY) / 2;
      return {
        id: edge.id,
        waypoints: [
          { x: srcCx, y: exitY },
          { x: srcCx, y: midPy },
          { x: tgtCx, y: midPy },
          { x: tgtCx, y: entryY },
        ],
      };
    }

    const exitY = src.y + src.height;
    const entryY = tgt.y;
    const midPy = (exitY + entryY) / 2;
    return {
      id: edge.id,
      waypoints: [
        { x: srcCx, y: exitY },
        { x: srcCx, y: midPy },
        { x: tgtCx, y: midPy },
        { x: tgtCx, y: entryY },
      ],
    };
  });
}

export class TypeScriptFallbackBridge implements WasmBridge {
  readonly name = "ts-fallback";

  async compute(input: WasmGraphInput): Promise<WasmLayoutResult> {
    const { nodes, edges, direction, nodeSize, spacing, padding } = input;
    const isHorizontal = direction === "LR" || direction === "RL";

    if (nodes.length === 0) {
      return { nodes: [], edges: [], width: padding * 2, height: padding * 2 };
    }

    const sortedNodes = sortedById(nodes);
    const nodeIds = sortedNodes.map((n) => n.id);
    const rank = computeRanks(nodeIds, edges);

    const maxRank = Math.max(0, ...Object.values(rank));

    const byRank = new Map<number, string[]>();
    for (const id of nodeIds) {
      const r = rank[id] ?? 0;
      const existing = byRank.get(r) ?? [];
      existing.push(id);
      byRank.set(r, existing);
    }

    const colIndex: Record<string, number> = {};
    for (let r = 0; r <= maxRank; r++) {
      const ids = byRank.get(r) ?? [];
      ids.forEach((id, i) => {
        colIndex[id] = i;
      });
    }

    for (let iteration = 0; iteration < 3; iteration++) {
      for (let r = 0; r <= maxRank; r++) {
        const ordered = barycenterOrder(byRank.get(r) ?? [], edges, colIndex);
        byRank.set(r, ordered);
        ordered.forEach((id, i) => {
          colIndex[id] = i;
        });
      }
    }

    const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const id of nodeIds) {
      const r = rank[id] ?? 0;
      const col = colIndex[id] ?? 0;

      const rankOffset =
        padding +
        r * (isHorizontal ? nodeSize.width + spacing.rank : nodeSize.height + spacing.rank);
      const colOffset =
        padding +
        col * (isHorizontal ? nodeSize.height + spacing.node : nodeSize.width + spacing.node);

      positions.set(id, {
        x: isHorizontal ? rankOffset : colOffset,
        y: isHorizontal ? colOffset : rankOffset,
        width: nodeSize.width,
        height: nodeSize.height,
      });
    }

    if (direction === "BT") {
      let maxY = 0;
      for (const p of positions.values()) {
        if (p.y > maxY) maxY = p.y;
      }
      for (const id of nodeIds) {
        const p = positions.get(id);
        if (p !== undefined) {
          positions.set(id, { ...p, y: maxY - p.y + padding });
        }
      }
    }
    if (direction === "RL") {
      let maxX = 0;
      for (const p of positions.values()) {
        if (p.x > maxX) maxX = p.x;
      }
      for (const id of nodeIds) {
        const p = positions.get(id);
        if (p !== undefined) {
          positions.set(id, { ...p, x: maxX - p.x + padding });
        }
      }
    }

    const edgeRoutes = computeEdgeRoutes(input, Object.fromEntries(positions));

    const allX: number[] = [];
    const allY: number[] = [];
    for (const p of positions.values()) {
      allX.push(p.x + p.width);
      allY.push(p.y + p.height);
    }
    for (const route of edgeRoutes) {
      for (const wp of route.waypoints) {
        allX.push(wp.x);
        allY.push(wp.y);
      }
    }

    return {
      nodes: sortedNodes.map((n) => {
        const pos = positions.get(n.id) ?? {
          x: padding,
          y: padding,
          width: nodeSize.width,
          height: nodeSize.height,
        };
        return { id: n.id, x: pos.x, y: pos.y, width: pos.width, height: pos.height };
      }),
      edges: edgeRoutes,
      width: Math.max(padding * 2, ...allX) + padding,
      height: Math.max(padding * 2, ...allY) + padding,
    };
  }
}
