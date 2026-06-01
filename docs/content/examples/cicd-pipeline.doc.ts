import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "CI/CD Pipeline",
  description: "Software delivery pipeline documented with activity, deployment, and sequence diagrams",
  content: await md`
# CI/CD Pipeline

This example documents a continuous integration and delivery pipeline for a containerized application. The pipeline runs on GitHub Actions, builds Docker images stored in a container registry, and deploys to Kubernetes clusters for staging and production environments. The system includes automated rollback capabilities triggered by health check failures.

## Pipeline Stages

@diagram ./cicd-pipeline.activity.ts "CI/CD pipeline stages"

The activity diagram shows the full pipeline stages from code commit to production deployment. The pipeline starts with building the application, then runs a linter to catch style issues, executes unit tests for regression coverage, and performs a security scan to identify vulnerabilities in dependencies.

If the security scan finds issues, the build fails immediately. Otherwise, the pipeline deploys to the staging environment and runs smoke tests. If smoke tests pass, the pipeline proceeds to production deployment and verifies the deployment is healthy.

If any stage fails after staging deployment, the pipeline triggers a rollback to the previous known-good version.

## Infrastructure

@diagram ./cicd-pipeline.deployment.ts "CI/CD deployment topology"

The deployment diagram shows the infrastructure components involved in the delivery pipeline. GitHub Actions provides the CI runner that orchestrates the pipeline. Built Docker images are pushed to a container registry. Staging and production Kubernetes clusters host the application workloads. Monitoring tools (Prometheus and Grafana) observe the deployed applications and surface metrics for health checks.

## Rollback Flow

@diagram ./cicd-pipeline.sequence.ts "Rollback sequence when health checks fail"

The sequence diagram shows the rollback flow when a health check failure is detected in production. The CI/CD system receives the health check failure notification and sends an alert to the Alert Manager. If an engineer approves the rollback, the CI/CD system instructs Kubernetes to pull the previous Docker image from the registry and deploy the previous working version. Once the rollback is complete, a health check verifies recovery.

If the rollback is rejected, the incident is escalated for manual intervention.

## Architecture Decisions

The pipeline enforces quality gates at every stage. Linting and unit tests catch issues before they reach staging. Security scanning prevents vulnerable dependencies from reaching production. Smoke tests validate the deployment in staging before promoting to production.

Automated rollback reduces mean time to recovery (MTTR) when issues slip through testing. Rather than requiring an engineer to manually diagnose and fix production issues, the system reverts to a known-good state while the team investigates the root cause.

The separation between staging and production clusters provides isolation. Staging uses a separate cluster to avoid interfering with production workloads during testing and to provide a production-like environment for validation.
`,
});
