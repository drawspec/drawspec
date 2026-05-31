import { activityDiagram } from "../../../packages/uml-activity/src/index.js";

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

  start().to(ingest);

  ingest.to(validate);

  decision("Schema Valid?")
    .when("valid").to(transform)
    .when("invalid").to(notify);

  transform.to(enrich);

  decision("Enrichment Success?")
    .when("yes").to(analyze)
    .when("no").to(retry);

  retry.to(decision("Retry Success?"))
    .when("yes").to(analyze)
    .when("no").to(logError).to(notify);

  analyze.to(store);

  decision("Store Success?")
    .when("yes").to(alert)
    .when("no").to(logError).to(notify);

  alert.to(successEnd);
  notify.to(errorEnd);
  logError.to(errorEnd);
});