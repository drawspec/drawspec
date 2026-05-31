import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "Advanced Activity Diagram",
  description: "Data processing pipeline with retry logic, multiple decision points, and error handling",
  content: await md`
# Advanced Activity Diagram

This example shows a data processing pipeline with retry logic, multiple decision points, and error handling paths. It demonstrates how activity diagrams model complex workflows with conditional branches.

## Diagram

@diagram ./activity-advanced.activity.ts "Data processing pipeline"

## Code

\`\`\`typescript
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
\`\`\`

## How It Works

The pipeline starts by ingesting data and validating its schema. If the schema is invalid, the process skips directly to notification and terminates with an error. Valid data proceeds to transformation and enrichment.

The enrichment step can fail. If it does, the workflow enters a retry loop. The retry decision checks whether the operation succeeded on the second attempt. If it still fails, the error is logged and the user is notified before terminating with an error.

After successful enrichment, the pipeline analyzes patterns and stores the results. Storage can also fail, which leads to error logging and notification. Both failure paths converge at the error termination node.

Successful completion triggers an alert and terminates at the success node, ensuring operations team is notified of successful pipeline runs.

## Run It

\`\`\`bash
bunx drawspec render activity-advanced.activity.ts --out dist
\`\`\`

Then open the generated SVG file in the \`dist/\` directory.
`,
});