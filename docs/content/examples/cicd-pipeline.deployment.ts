import { deploymentDiagram } from "../../../packages/uml-deployment/src/index.js";

export default deploymentDiagram("CI/CD Infrastructure", (d) => {
  d.deploymentNode("GitHub", (n) => {
    n.artifact("GitHub Actions Runner");
  });
  d.deploymentNode("Container Registry", (n) => {
    n.artifact("Docker Images");
  });
  d.deploymentNode("Staging Cluster", (n) => {
    n.artifact("Kubernetes Pods");
  });
  d.deploymentNode("Production Cluster", (n) => {
    n.artifact("Kubernetes Pods");
  });
  d.deploymentNode("Monitoring", (n) => {
    n.artifact("Prometheus");
    n.artifact("Grafana");
  });
});
