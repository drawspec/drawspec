import { activityDiagram } from "@drawspec/uml-activity";

export default activityDiagram("CI/CD Pipeline", ({ start, action, decision, end }) => {
  const startPipeline = start("Start pipeline");
  const buildApplication = action("Build application");
  const runLinter = action("Run linter");
  const runUnitTests = action("Run unit tests");
  const securityScan = action("Security scan");
  const scanPassed = decision("Scan passed?");
  const deployStaging = action("Deploy to staging");
  const failBuild = action("Fail build");
  const smokeTests = action("Smoke tests");
  const testsPassed = decision("Tests passed?");
  const deployProduction = action("Deploy to production");
  const rollback = action("Rollback");
  const verifyDeployment = action("Verify deployment");
  const failed = end("Build failed");
  const complete = end("Pipeline complete");

  startPipeline.to(buildApplication).to(runLinter).to(runUnitTests).to(securityScan).to(scanPassed);
  scanPassed.when("Yes").to(deployStaging).to(smokeTests).to(testsPassed);
  scanPassed.when("No").to(failBuild).to(failed);
  testsPassed.when("Yes").to(deployProduction).to(verifyDeployment).to(complete);
  testsPassed.when("No").to(rollback).to(complete);
});
