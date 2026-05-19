import type { DiagramDocument } from "@drawspec/core";

export interface DeploymentNode {
  readonly id: string;
  readonly name: string;
  readonly artifacts: readonly Artifact[];
  readonly properties: Readonly<Record<string, string>>;
}

export interface InfrastructureNode {
  readonly id: string;
  readonly name: string;
  readonly properties: Readonly<Record<string, string>>;
}

export interface Artifact {
  readonly id: string;
  readonly name: string;
  readonly parentNodeId: string;
}

export interface CommunicationPath {
  readonly id: string;
  readonly sourceName: string;
  readonly targetName: string;
  readonly protocol: string | undefined;
}

export interface DeploymentNodeBuilder {
  readonly id: string;
  artifact(name: string): void;
  property(key: string, value: string): void;
}

export interface InfrastructureNodeBuilder {
  readonly id: string;
  property(key: string, value: string): void;
}

export interface DeploymentDiagramBuilder {
  deploymentNode(name: string, configure?: (node: DeploymentNodeBuilder) => void): string;
  infrastructureNode(name: string, configure?: (node: InfrastructureNodeBuilder) => void): string;
  communicationPath(source: string, target: string, options?: { protocol?: string }): void;
}

export interface DeploymentDomainModel {
  readonly id: string;
  readonly title: string;
  readonly deploymentNodes: readonly DeploymentNode[];
  readonly infrastructureNodes: readonly InfrastructureNode[];
  readonly communicationPaths: readonly CommunicationPath[];
}

export type DeploymentDocument = DiagramDocument & { kind: "deployment" };
