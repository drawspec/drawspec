import { stateDiagram } from "../../../packages/uml-state/src/index.js";

export default stateDiagram("Message Delivery", ({ state, initial, final }) => {
  const sent = state("Sent");
  const delivered = state("Delivered");
  const read = state("Read");
  const failed = state("Failed");

  return [
    initial(sent),
    sent.to(delivered, "Recipient received"),
    delivered.to(read, "Recipient opened"),
    sent.to(failed, "Delivery failed"),
    delivered.to(failed, "Recipient offline"),
    final(failed),
    final(read),
  ];
});
