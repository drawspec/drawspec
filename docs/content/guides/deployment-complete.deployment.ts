import { deploymentDiagram } from "../../../packages/uml-deployment/src/index.js";

export default deploymentDiagram("Three-tier application", (builder) => {
  builder.deploymentNode("Load Balancer", (node) => {
    node.artifact("nginx.conf");
    node.property("software", "nginx 1.24");
    node.property("type", "F5 BIG-IP");
  });

  builder.deploymentNode("Application Server", (node) => {
    node.artifact("web-app.war");
    node.artifact("lib/custom.jar");
    node.property("runtime", "Java 17");
    node.property("server", "WildFly 28");
  });

  builder.deploymentNode("Database Server", (node) => {
    node.artifact("appdb");
    node.artifact("backup-job.sh");
    node.property("engine", "PostgreSQL 15");
    node.property("storage", "1TB NVMe");
  });

  builder.infrastructureNode("Content Delivery Network");

  builder.communicationPath("Load Balancer", "Application Server", { protocol: "AJP/1.3" });
  builder.communicationPath("Application Server", "Database Server", { protocol: "PostgreSQL Wire" });
  builder.communicationPath("Application Server", "Content Delivery Network", { protocol: "HTTPS" });
});
