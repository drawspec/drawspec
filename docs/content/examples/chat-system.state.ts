import { stateDiagram } from "../../../packages/uml-state/src/index.js";

export default stateDiagram("Message Delivery", ({ state, initial, final }) => {
  const start = initial("start");
  const sent = state("Sent");
  const delivered = state("Delivered");
  const read = state("Read");
  const failed = state("Failed");
  const failedEnd = final("failed");
  const readEnd = final("read");

  start.to(sent);
  sent.to(delivered, "Recipient received");
  delivered.to(read, "Recipient opened");
  sent.to(failed, "Delivery failed");
  delivered.to(failed, "Recipient offline");
  failed.to(failedEnd);
  read.to(readEnd);

  return [start, sent, delivered, read, failed, failedEnd, readEnd];
});
