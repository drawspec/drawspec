import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "AWS Serverless Architecture",
  description: "Documenting a serverless application on AWS using C4, deployment, and sequence diagrams",
  content: await md`
# AWS Serverless Architecture

This example documents a production-ready serverless application running on AWS. The architecture uses API Gateway for API routing, Lambda for compute, DynamoDB for data persistence, and S3 for asset storage. The system is designed for high availability with multi-AZ deployment and asynchronous processing via SQS.

## System Context

@diagram ./aws-serverless.arch.ts "System context for AWS serverless app"

The context view shows how users interact with the system through API Gateway, which then routes requests to Lambda functions. DynamoDB and S3 are the primary data stores.

## Container View

@diagram ./aws-serverless-container.arch.ts "Container view showing internal components"

The container view zooms into the AWS App system to show the internal components: API Gateway handles routing and auth, Lambda Authorizer verifies JWT tokens, Lambda Handler processes synchronous requests, and Lambda Worker handles async tasks from SQS. DynamoDB Orders stores order data while DynamoDB Sessions manages session state.

## Infrastructure

@diagram ./aws-serverless.deployment.ts "Multi-AZ deployment on AWS"

The deployment diagram shows the VPC structure with public subnets for API Gateway and private subnets for Lambda functions. DynamoDB and S3 are deployed in a dedicated DB subnet. High availability is achieved by deploying Lambda functions across two availability zones.

## Request Flow

@diagram ./aws-serverless.sequence.ts "API request sequence"

The sequence diagram shows the full request lifecycle: the client sends a POST request to API Gateway, which invokes the Lambda Authorizer to verify the JWT token. Once authorized, API Gateway invokes the Lambda Handler, which writes to DynamoDB and returns a 201 Created response.

## Architecture Decisions

The serverless architecture prioritizes operational simplicity and pay-per-use pricing. Using Lambda with API Gateway eliminates the need to manage servers or container orchestration. DynamoDB provides single-digit millisecond latency at any scale, making it ideal for high-throughput workloads. SQS decouples synchronous request handling from background processing, allowing the system to handle burst traffic without overwhelming downstream services.

The multi-AZ deployment ensures that the application remains available even if an entire availability zone goes down. Lambda functions are deployed in private subnets to restrict direct internet access, while API Gateway lives in public subnets to receive traffic from the internet.
`,
});
