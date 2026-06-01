import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Basic Deployment Diagram",
  description: "Web server and database server with artifacts and communication paths",
  content: await md`
# Basic Deployment Diagram

Deployment diagrams show the physical arrangement of hardware nodes and the software artifacts that run on them. Each deployment node represents a computational resource, and artifacts represent deployable units.

## Diagram

@diagram ./basic-deployment.deployment.ts "Web + DB deployment"

## Code

\`\`\`typescript
import { deploymentDiagram } from "@drawspec/uml-deployment";

export default deploymentDiagram("Web + DB deployment", (d) => {
  const web = d.deploymentNode("Web Server", (n) => {
    n.artifact("app.war");
    n.property("Region", "us-east-1");
  });

  const db = d.deploymentNode("Database Server", (n) => {
    n.artifact("postgres.rdb");
    n.artifact("data Vol");
    n.property("Region", "us-east-1");
  });

  d.communicationPath("Web Server", "Database Server", { protocol: "TCP/IP" });
});
\`\`\`

## How It Works

The Web Server deployment node hosts the \`app.war\` artifact, which is a deployable web application archive. The Database Server hosts the PostgreSQL database artifact along with a data volume for persistent storage.

The \`communicationPath()\` method defines how nodes communicate. Here, the web server communicates with the database server over TCP/IP, indicating a standard database connection protocol.

Deployment nodes can have properties that describe their characteristics. Both servers are tagged with "Region: us-east-1" to indicate their geographic location in a cloud infrastructure.

## Run It

\`\`\`bash
bunx drawspec render basic-deployment.deployment.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});