import { deploymentDiagram } from "../../packages/uml-deployment/src";

export default deploymentDiagram("Cloud deployment", (d) => {
  d.deploymentNode("CDN Edge", (n) => {
    n.artifact("Static Assets");
    n.property("provider", "CloudFront");
  });
  d.deploymentNode("App Cluster", (n) => {
    n.artifact("Web App");
    n.artifact("API Service");
    n.property("runtime", "Bun");
  });
  d.deploymentNode("Worker Pool", (n) => {
    n.artifact("Order Worker");
    n.property("runtime", "Bun");
  });
  d.infrastructureNode("Managed Postgres", (n) => {
    n.property("engine", "postgresql");
  });
  d.infrastructureNode("Message Queue", (n) => {
    n.property("service", "SQS");
  });

  d.communicationPath("CDN Edge", "App Cluster", { protocol: "HTTPS" });
  d.communicationPath("App Cluster", "Managed Postgres", { protocol: "TLS" });
  d.communicationPath("App Cluster", "Message Queue", { protocol: "HTTPS" });
  d.communicationPath("Worker Pool", "Message Queue", { protocol: "HTTPS" });
  d.communicationPath("Worker Pool", "Managed Postgres", { protocol: "TLS" });
});
