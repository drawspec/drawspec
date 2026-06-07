import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Basic Deployment Diagram",
  description: "Web server and database server with artifacts and communication paths",
  content: await md`
# Basic Deployment Diagram

Deployment diagrams show the physical arrangement of hardware nodes and the software artifacts that run on them. Each deployment node represents a computational resource, and artifacts represent deployable units.

## Diagram

@diagram ./basic-deployment.deployment.ts "Web + DB deployment"

## Code

@source typescript ./basic-deployment.deployment.ts

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