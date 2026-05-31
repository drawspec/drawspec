import { deploymentDiagram } from "../../../packages/uml-deployment/src/index.js";

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