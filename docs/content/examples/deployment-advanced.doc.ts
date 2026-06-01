import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Advanced Deployment Diagram",
  description: "Multi-AZ deployment with web servers, app servers, database replica, and cache",
  content: await md`
# Advanced Deployment Diagram

This example shows a production-ready multi-Availability Zone (AZ) deployment with web servers, application servers, database replication, and a cache layer. It demonstrates how deployment diagrams model real-world infrastructure.

## Diagram

@diagram ./deployment-advanced.deployment.ts "Multi-AZ deployment"

## Code

\`\`\`typescript
import { deploymentDiagram } from "@drawspec/uml-deployment";

export default deploymentDiagram("Multi-AZ deployment", (d) => {
  const webAz1 = d.deploymentNode("Web Server (AZ1)", (n) => {
    n.artifact("app.war");
    n.artifact("config.yaml");
    n.property("Availability Zone", "us-east-1a");
  });

  const webAz2 = d.deploymentNode("Web Server (AZ2)", (n) => {
    n.artifact("app.war");
    n.artifact("config.yaml");
    n.property("Availability Zone", "us-east-1b");
  });

  const appAz1 = d.deploymentNode("App Server (AZ1)", (n) => {
    n.artifact("api.jar");
    n.property("Availability Zone", "us-east-1a");
  });

  const appAz2 = d.deploymentNode("App Server (AZ2)", (n) => {
    n.artifact("api.jar");
    n.property("Availability Zone", "us-east-1b");
  });

  const dbPrimary = d.deploymentNode("DB Primary", (n) => {
    n.artifact("postgres.rdb");
    n.property("Region", "us-east-1");
    n.property("Replication", "sync");
  });

  const dbReplica = d.deploymentNode("DB Replica", (n) => {
    n.artifact("postgres.rdb");
    n.property("Region", "us-east-1");
    n.property("Replication", "async");
  });

  const cache = d.deploymentNode("Redis Cache", (n) => {
    n.artifact("redis-cluster");
    n.property("Region", "us-east-1");
  });

  d.communicationPath("Web Server (AZ1)", "App Server (AZ1)", { protocol: "HTTPS" });
  d.communicationPath("Web Server (AZ2)", "App Server (AZ2)", { protocol: "HTTPS" });
  d.communicationPath("App Server (AZ1)", "DB Primary", { protocol: "TCP" });
  d.communicationPath("App Server (AZ1)", "DB Replica", { protocol: "TCP" });
  d.communicationPath("App Server (AZ1)", "Redis Cache", { protocol: "Redis" });
  d.communicationPath("App Server (AZ2)", "Redis Cache", { protocol: "Redis" });
  d.communicationPath("DB Primary", "DB Replica", { protocol: "Replication" });
});
\`\`\`

## How It Works

The deployment spans two availability zones for high availability. Each zone has a web server running the application artifact and an app server running the API. The web servers communicate with their local app servers over HTTPS.

App servers connect to both the primary database and the replica for read operations. The primary database replicates synchronously to the replica, ensuring data consistency for failover.

The Redis cache sits between the app servers and databases, reducing database load for frequently accessed data. Both app servers can reach the cache regardless of AZ, as cache is a shared resource in this model.

## Run It

\`\`\`bash
bunx drawspec render deployment-advanced.deployment.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});