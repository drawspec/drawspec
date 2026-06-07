import { workspace, softwareSystem, person } from "@drawspec/architecture";

export default workspace("AWS App", (ws) => {
  const user = ws.model.add(person("User", { description: "End user of the application" }));
  const app = ws.model.add(softwareSystem("AWS App", { description: "Serverless application on AWS" }));

  const apiGw = ws.model.add(softwareSystem("API Gateway", { description: "REST API gateway" }));
  const lambda = ws.model.add(softwareSystem("Lambda", { description: "Serverless compute" }));
  const dynamo = ws.model.add(softwareSystem("DynamoDB", { description: "NoSQL database" }));
  const s3 = ws.model.add(softwareSystem("S3", { description: "Object storage" }));

  user.uses(apiGw, "Makes API requests");
  apiGw.uses(lambda, "Invokes functions");
  lambda.uses(dynamo, "Reads/writes data");
  lambda.uses(s3, "Stores assets");

  ws.views.systemContext(app, "aws-context", (view) => {
    view.include(user, apiGw, lambda, dynamo, s3);
    view.autoLayout("left-right");
  });
});
