import { sequence } from "../../../packages/uml-sequence/src/index.js";

export default sequence("API Request", (seq) => {
  const client = seq.actor("Client");
  const apiGw = seq.participant("API Gateway");
  const authorizer = seq.participant("Lambda Authorizer");
  const handler = seq.participant("Lambda Handler");
  const dynamo = seq.participant("DynamoDB");

  client.to(apiGw, "POST /orders");
  apiGw.to(authorizer, "Verify token");
  authorizer.to(apiGw, "Allow");
  apiGw.to(handler, "Invoke");
  handler.to(dynamo, "PutItem");
  dynamo.to(handler, "200 OK");
  handler.to(client, "201 Created");
});
