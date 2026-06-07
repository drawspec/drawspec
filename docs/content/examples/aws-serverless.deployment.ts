import { deploymentDiagram } from "@drawspec/uml-deployment";

export default deploymentDiagram("AWS Infrastructure", (d) => {
  d.deploymentNode("VPC", (n) => {
    n.property("CIDR", "10.0.0.0/16");
  });

  d.deploymentNode("Public Subnet AZ1", (n) => {
    n.artifact("API Gateway");
    n.property("Zone", "us-east-1a");
  });
  d.deploymentNode("Public Subnet AZ2", (n) => {
    n.artifact("API Gateway HA");
    n.property("Zone", "us-east-1b");
  });
  d.deploymentNode("Private Subnet AZ1", (n) => {
    n.artifact("Lambda Handler");
    n.artifact("Lambda Worker");
    n.property("Zone", "us-east-1a");
  });
  d.deploymentNode("Private Subnet AZ2", (n) => {
    n.artifact("Lambda Handler HA");
    n.artifact("Lambda Worker HA");
    n.property("Zone", "us-east-1b");
  });
  d.deploymentNode("Private Subnet DB", (n) => {
    n.artifact("DynamoDB");
    n.artifact("S3");
    n.property("Zone", "us-east-1a");
  });

  d.communicationPath("Public Subnet AZ1", "Private Subnet AZ1", { protocol: "HTTPS" });
  d.communicationPath("Public Subnet AZ2", "Private Subnet AZ2", { protocol: "HTTPS" });
  d.communicationPath("Private Subnet AZ1", "Private Subnet DB", { protocol: "TCP" });
  d.communicationPath("Private Subnet AZ2", "Private Subnet DB", { protocol: "TCP" });
});
