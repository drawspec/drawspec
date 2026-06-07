import { activityDiagram } from "@drawspec/uml-activity";

export default activityDiagram("Data processing pipeline", ({ start, action, decision, end }) => {
  const ingest = action("Ingest Data");
  const validate = action("Validate Schema");
  const transform = action("Transform Data");
  const enrich = action("Enrich Records");
  const analyze = action("Analyze Patterns");
  const store = action("Store Results");
  const alert = action("Send Alerts");
  const retry = action("Retry Failed");
  const logError = action("Log Error");
  const notify = action("Notify Issues");

  const successEnd = end("Success");
  const errorEnd = end("Error");
  const schemaValid = decision("Schema Valid?");
  const enrichmentSuccess = decision("Enrichment Success?");
  const retrySuccess = decision("Retry Success?");
  const storeSuccess = decision("Store Success?");

  start().to(ingest);

  ingest.to(validate).to(schemaValid);

  schemaValid.when("valid").to(transform);
  schemaValid.when("invalid").to(notify);

  transform.to(enrich).to(enrichmentSuccess);

  enrichmentSuccess.when("yes").to(analyze);
  enrichmentSuccess.when("no").to(retry).to(retrySuccess);

  retrySuccess.when("yes").to(analyze);
  retrySuccess.when("no").to(logError);

  analyze.to(store).to(storeSuccess);

  storeSuccess.when("yes").to(alert);
  storeSuccess.when("no").to(logError);

  alert.to(successEnd);
  logError.to(notify);
  notify.to(errorEnd);
});
