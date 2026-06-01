import { workspace, softwareSystem, person } from "../../../packages/architecture/src/index.js";

export default workspace("AWS App", (ws) => {
  const user = ws.model.add(person("User", { description: "End user" }));
  const app = ws.model.add(softwareSystem("AWS App", { description: "Serverless application" }));

  const apiGw = ws.model.add(softwareSystem("API Gateway", { description: "REST API gateway" }));
  const authorizer = ws.model.add(softwareSystem("Lambda Authorizer", { description: "Token verification" }));
  const handler = ws.model.add(softwareSystem("Lambda Handler", { description: "Request handler" }));
  const worker = ws.model.add(softwareSystem("Lambda Worker", { description: "Async background worker" }));
  const dynamoOrders = ws.model.add(softwareSystem("DynamoDB Orders", { description: "Orders table" }));
  const dynamoSessions = ws.model.add(softwareSystem("DynamoDB Sessions", { description: "Sessions table" }));
  const s3Assets = ws.model.add(softwareSystem("S3 Assets", { description: "Static assets bucket" }));
  const sqsQueue = ws.model.add(softwareSystem("SQS Queue", { description: "Message queue" }));

  user.uses(apiGw, "Makes requests");
  apiGw.uses(authorizer, "Verifies token");
  authorizer.uses(apiGw, "Allow/Deny");
  apiGw.uses(handler, "Invokes");
  handler.uses(dynamoOrders, "CRUD operations");
  handler.uses(dynamoSessions, "Session data");
  handler.uses(s3Assets, "Upload/download");
  handler.uses(sqsQueue, "Enqueue task");
  sqsQueue.uses(worker, "Processes messages");
  worker.uses(dynamoOrders, "Updates");

  ws.views.container(app, "aws-container", (view) => {
    view.include(user, apiGw, authorizer, handler, worker, dynamoOrders, dynamoSessions, s3Assets, sqsQueue);
    view.autoLayout("left-right");
  });
});
