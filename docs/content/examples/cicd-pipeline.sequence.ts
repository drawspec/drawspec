import { sequence } from "../../../packages/uml-sequence/src/index.js";

export default sequence("Rollback Flow", (seq) => {
  const healthCheck = seq.actor("Health Check");
  const alertMgr = seq.participant("Alert Manager");
  const ciSystem = seq.participant("CI/CD System");
  const k8s = seq.participant("Kubernetes");
  const registry = seq.participant("Container Registry");

  healthCheck.to(ciSystem, "Health check failed");
  ciSystem.to(alertMgr, "Send alert");
  alertMgr.to(ciSystem, "Alert sent");
  seq
    .alt("Approved", () => {
      ciSystem.to(k8s, "Rollback deployment");
      k8s.to(registry, "Pull previous image");
      k8s.to(k8s, "Deploy previous version");
      k8s.to(ciSystem, "Rollback complete");
    })
    .else("Rejected", () => {
      ciSystem.to(ciSystem, "Escalate incident");
    });
  ciSystem.to(healthCheck, "Verify recovery");
});
