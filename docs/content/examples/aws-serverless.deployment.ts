import { deploymentDiagram } from "@drawspec/uml-deployment";

export default deploymentDiagram("AWS Infrastructure", (d) => {
  d.deploymentNode("VPC", (n) => {
    n.deploymentNode("Public Subnet AZ1", (az1) => {
      az1.artifact("API Gateway");
    });
    n.deploymentNode("Public Subnet AZ2", (az2) => {
      az2.artifact("API Gateway HA");
    });
    n.deploymentNode("Private Subnet AZ1", (priv1) => {
      priv1.artifact("Lambda Handler");
      priv1.artifact("Lambda Worker");
    });
    n.deploymentNode("Private Subnet AZ2", (priv2) => {
      priv2.artifact("Lambda Handler HA");
      priv2.artifact("Lambda Worker HA");
    });
    n.deploymentNode("Private Subnet DB", (db) => {
      db.artifact("DynamoDB");
      db.artifact("S3");
    });
  });
});
