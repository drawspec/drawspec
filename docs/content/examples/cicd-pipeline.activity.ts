import { activityDiagram } from "../../../packages/uml-activity/src/index.js";

export default activityDiagram("CI/CD Pipeline", ({ start, action, decision, end }) => {
  return [
    start("Start pipeline"),
    action("Build application"),
    action("Run linter"),
    action("Run unit tests"),
    action("Security scan"),
    decision("Scan passed?"),
    decision.to("Deploy to staging", "Yes"),
    decision.to("Fail build", "No"),
    action("Smoke tests"),
    decision("Tests passed?"),
    decision.to("Deploy to production", "Yes"),
    decision.to("Rollback", "No"),
    action("Verify deployment"),
    end("Pipeline complete"),
  ];
});
