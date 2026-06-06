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

@source typescript ./deployment-advanced.deployment.ts

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