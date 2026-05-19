import {
  createDeterministicId,
  type Diagnostic,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramNode,
} from "@drawspec/core";
import type { DeploymentDocument, DeploymentDomainModel } from "./types";

function diagnostic(code: string, message: string): Diagnostic {
  return { severity: "error", code, message };
}

export function compileDeploymentDocument(model: DeploymentDomainModel): DeploymentDocument {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const groups: DiagramGroup[] = [];
  const diagnostics: Diagnostic[] = [];

  const nameToId = new Map<string, string>();

  for (const dn of model.deploymentNodes) {
    nameToId.set(dn.name, dn.id);
    const node: DiagramNode = {
      id: dn.id,
      kind: "deployment-node",
      label: dn.name,
    };
    if (Object.keys(dn.properties).length > 0) {
      node.metadata = { ...dn.properties };
    }
    nodes.push(node);

    for (const art of dn.artifacts) {
      nodes.push({
        id: art.id,
        kind: "artifact",
        label: art.name,
        parentId: art.parentNodeId,
      });
    }

    if (dn.artifacts.length > 0) {
      groups.push({
        id: createDeterministicId({ kind: "node-group", nodeId: dn.id }, { prefix: "grp" }),
        kind: "deployment-node",
        label: dn.name,
        childIds: dn.artifacts.map((a) => a.id).sort(),
      });
    }
  }

  for (const infra of model.infrastructureNodes) {
    nameToId.set(infra.name, infra.id);
    const node: DiagramNode = {
      id: infra.id,
      kind: "infrastructure-node",
      label: infra.name,
    };
    if (Object.keys(infra.properties).length > 0) {
      node.metadata = { ...infra.properties };
    }
    nodes.push(node);
  }

  for (const cp of model.communicationPaths) {
    const sourceId = nameToId.get(cp.sourceName);
    const targetId = nameToId.get(cp.targetName);

    if (sourceId === undefined || targetId === undefined) {
      const missing: string[] = [];
      if (sourceId === undefined) missing.push(`source "${cp.sourceName}"`);
      if (targetId === undefined) missing.push(`target "${cp.targetName}"`);
      diagnostics.push(
        diagnostic(
          "deployment/unresolved-endpoint",
          `Communication path references unresolved ${missing.join(" and ")}`
        )
      );
      continue;
    }

    const edge: DiagramEdge = {
      id: cp.id,
      kind: "communication",
      sourceId,
      targetId,
      direction: "none",
    };
    if (cp.protocol !== undefined) {
      edge.label = cp.protocol;
    }
    edges.push(edge);
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));
  groups.sort((a, b) => a.id.localeCompare(b.id));

  const document: DeploymentDocument = {
    schemaVersion: "1.0.0",
    id: model.id,
    title: model.title,
    kind: "deployment",
    nodes,
    edges,
    groups,
    annotations: [],
  };
  if (diagnostics.length > 0) {
    document.diagnostics = diagnostics;
  }
  return document;
}
