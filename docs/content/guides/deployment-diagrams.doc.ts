import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Deployment Diagrams",
  description: "Model deployment topology and infrastructure architecture",
  content: await md`
# Deployment Diagrams

Deployment diagrams visualize the physical deployment of software artifacts across infrastructure nodes. They show where software components run, what artifacts are deployed, and how nodes communicate.

## Quick Start

Define deployment nodes with artifacts:

@source typescript ./deployment-quick-start.deployment.ts
@diagram ./deployment-quick-start.deployment.ts "Quick start deployment diagram"

The callback receives a builder with methods for creating deployment nodes, infrastructure nodes, artifacts, and communication paths.

## Key Concepts

### Deployment Nodes

Deployment nodes represent physical or virtual hardware where artifacts run:

\`\`\`typescript
builder.deploymentNode("Production Server", (node) => {
  node.property("os", "Ubuntu 22.04");
  node.property("cpu", "8 cores");
  node.property("ram", "32GB");
});
\`\`\`

### Artifacts

Artifacts are deployable software components such as WAR files, JAR files, or scripts:

\`\`\`typescript
builder.deploymentNode("App Server", (node) => {
  node.artifact("api-service.jar");
  node.artifact("config.yaml");
  node.artifact("startup.sh");
});
\`\`\`

### Infrastructure Nodes

Infrastructure nodes represent external systems or services without artifacts:

\`\`\`typescript
builder.infrastructureNode("Cloud Storage", (node) => {
  node.property("provider", "AWS S3");
  node.property("tier", "Standard");
});
\`\`\`

### Communication Paths

Connect nodes with communication paths to show network relationships:

\`\`\`typescript
builder.communicationPath("Load Balancer", "App Server", { protocol: "HTTPS" });
builder.communicationPath("App Server", "Database", { protocol: "PostgreSQL" });
\`\`\`

## Advanced Usage

### Nested Deployment Nodes

Model hierarchical infrastructure with nested deployment nodes:

\`\`\`typescript
builder.deploymentNode("Cloud Environment", (node) => {
  node.property("provider", "AWS");
  node.property("region", "us-east-1");

  node.artifact("kubernetes-cluster");
});

builder.deploymentNode("Kubernetes Cluster", (node) => {
  node.property("version", "1.27");
  node.property("nodes", "5");

  node.artifact("frontend-deployment");
  node.artifact("backend-deployment");
});
\`\`\`

### Execution Environments

Use deployment node properties to describe execution environments:

\`\`\`typescript
builder.deploymentNode("Docker Host", (node) => {
  node.property("os", "Linux");
  node.property("container-runtime", "Docker 24");
  node.artifact("redis-container");
  node.artifact("nginx-container");
});
\`\`\`

## Complete Example

Here is a complete deployment diagram for a three-tier web application:

@source typescript ./deployment-complete.deployment.ts
@diagram ./deployment-complete.deployment.ts "Three-tier deployment diagram"
`,
});
