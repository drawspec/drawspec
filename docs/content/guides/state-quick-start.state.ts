import { stateDiagram } from "@drawspec/uml-state";

export default stateDiagram("Traffic light", ({ state, initial, final }) => [
  initial(),
  state("Red", (s) => s.to("Green").label("timer")),
  state("Green", (s) => s.to("Yellow").label("timer")),
  state("Yellow", (s) => s.to("Red").label("timer")),
  final(),
]);
