import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "C4 Deployment View",
  description: "Deployment-level diagram showing infrastructure nodes and containers",
  content: await md`
# C4 Deployment View

Deployment views show the physical infrastructure where containers run. Each deployment node represents a distinct computing environment such as a server, CDN edge location, or cloud region.

## Diagram

@diagram ./c4-deployment.arch.ts "E-commerce deployment"

## Code

@source typescript ./c4-deployment.arch.ts

## How It Works

Container nodes nest inside software systems to represent distinct tiers or infrastructure layers. The \`Shop\` system contains three tier containers: Web Tier running on AWS EC2, App Tier on AWS ECS, and Data Tier on AWS RDS.

Each tier container holds one or more deployable containers. The Web Tier hosts the React frontend, the App Tier hosts the Hono API, and the Data Tier holds the PostgreSQL database.

Relationships between containers traverse deployment boundaries. The Web App communicates with the API over HTTPS, and the API reads and writes to the PostgreSQL database over TCP/IP.

## Run It

\`\`\`bash
bunx drawspec render c4-deployment.arch.ts --out dist
\`\`\`
`,
});
