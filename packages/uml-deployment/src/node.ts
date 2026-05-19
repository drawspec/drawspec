import { createDeterministicId } from "@drawspec/core";
import { createArtifact } from "./artifact";
import type {
  Artifact,
  CommunicationPath,
  DeploymentDiagramBuilder,
  DeploymentDomainModel,
  DeploymentNode,
  DeploymentNodeBuilder,
  InfrastructureNode,
  InfrastructureNodeBuilder,
} from "./types";

class MutableDeploymentNode implements DeploymentNode, DeploymentNodeBuilder {
  readonly id: string;
  readonly name: string;
  readonly artifacts: Artifact[] = [];
  readonly properties: Record<string, string> = {};
  #artifactCount = 0;

  constructor(name: string, index: number) {
    this.name = name;
    this.id = createDeterministicId({ kind: "deployment-node", name, index }, { prefix: "dn" });
  }

  artifact(name: string): void {
    this.artifacts.push(createArtifact(name, this.id, this.#artifactCount));
    this.#artifactCount += 1;
  }

  property(key: string, value: string): void {
    this.properties[key] = value;
  }
}

class MutableInfrastructureNode implements InfrastructureNode, InfrastructureNodeBuilder {
  readonly id: string;
  readonly name: string;
  readonly properties: Record<string, string> = {};

  constructor(name: string, index: number) {
    this.name = name;
    this.id = createDeterministicId({ kind: "infrastructure-node", name, index }, { prefix: "in" });
  }

  property(key: string, value: string): void {
    this.properties[key] = value;
  }
}

class MutableDeploymentBuilder implements DeploymentDiagramBuilder {
  readonly title: string;
  readonly deploymentNodes: DeploymentNode[] = [];
  readonly infrastructureNodes: InfrastructureNode[] = [];
  readonly communicationPaths: CommunicationPath[] = [];
  #deploymentNodeCount = 0;
  #infrastructureNodeCount = 0;
  #communicationPathCount = 0;

  constructor(title: string) {
    this.title = title;
  }

  deploymentNode(name: string, configure?: (node: DeploymentNodeBuilder) => void): string {
    const node = new MutableDeploymentNode(name, this.#deploymentNodeCount);
    this.#deploymentNodeCount += 1;
    configure?.(node);
    this.deploymentNodes.push(node);
    return node.id;
  }

  infrastructureNode(name: string, configure?: (node: InfrastructureNodeBuilder) => void): string {
    const node = new MutableInfrastructureNode(name, this.#infrastructureNodeCount);
    this.#infrastructureNodeCount += 1;
    configure?.(node);
    this.infrastructureNodes.push(node);
    return node.id;
  }

  communicationPath(source: string, target: string, options?: { protocol?: string }): void {
    this.communicationPaths.push({
      id: createDeterministicId(
        {
          kind: "communication",
          source,
          target,
          protocol: options?.protocol,
          index: this.#communicationPathCount,
        },
        { prefix: "cp" }
      ),
      sourceName: source,
      targetName: target,
      protocol: options?.protocol,
    });
    this.#communicationPathCount += 1;
  }

  toModel(): DeploymentDomainModel {
    return {
      id: createDeterministicId({ kind: "deployment", title: this.title }, { prefix: "dep" }),
      title: this.title,
      deploymentNodes: this.deploymentNodes,
      infrastructureNodes: this.infrastructureNodes,
      communicationPaths: this.communicationPaths,
    };
  }
}

export { MutableDeploymentBuilder };
