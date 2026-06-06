import { deploymentDiagram } from "../../../packages/uml-deployment/src/index.js";

export default deploymentDiagram("Web application", (builder) => {
  builder.deploymentNode("Web Server", (node) => {
    node.artifact("web-app.war");
    node.property("framework", "Spring Boot");
    node.property("runtime", "Tomcat 9");
  });

  builder.deploymentNode("Database Server", (node) => {
    node.artifact("postgres-db");
    node.property("engine", "PostgreSQL 14");
    node.property("storage", "500GB SSD");
  });

  builder.communicationPath("Web Server", "Database Server", { protocol: "TCP/IP" });
});
