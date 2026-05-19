import { compileDeploymentDocument } from "./compile";
import { MutableDeploymentBuilder } from "./node";
import type { DeploymentDiagramBuilder, DeploymentDocument } from "./types";

export { createArtifact } from "./artifact";
export { compileDeploymentDocument } from "./compile";
export type {
  Artifact,
  CommunicationPath,
  DeploymentDiagramBuilder,
  DeploymentDocument,
  DeploymentDomainModel,
  DeploymentNode,
  DeploymentNodeBuilder,
  InfrastructureNode,
  InfrastructureNodeBuilder,
} from "./types";

export function deploymentDiagram(
  title: string,
  callback?: (builder: DeploymentDiagramBuilder) => void
): DeploymentDocument {
  const builder = new MutableDeploymentBuilder(title);
  callback?.(builder);
  return compileDeploymentDocument(builder.toModel());
}
