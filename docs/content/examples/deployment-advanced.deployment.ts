import { deploymentDiagram } from "../../../packages/uml-deployment/src/index.js";

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