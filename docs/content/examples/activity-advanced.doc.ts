import { defineDoc, md } from "@drawspec/docs";

export default defineDoc({
  title: "Advanced Activity Diagram",
  description: "Data processing pipeline with retry logic, multiple decision points, and error handling",
  content: await md`
# Advanced Activity Diagram

This example shows a data processing pipeline with retry logic, multiple decision points, and error handling paths. It demonstrates how activity diagrams model complex workflows with conditional branches.

## Diagram

@diagram ./activity-advanced.activity.ts "Data processing pipeline"

## Code

@source typescript ./activity-advanced.activity.ts

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
