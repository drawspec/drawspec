import { stateDiagram, initial, state, final } from "@drawspec/uml-state";

export default stateDiagram("Traffic Light", ({ initial, state, final }) => [
  initial().to(state("Red")),

  state("Red", (s) => {
    s.to("Green").label("timer");
  }),

  state("Green", (s) => {
    s.to("Yellow").label("timer");
  }),

  state("Yellow", (s) => {
    s.to("Red").label("timer");
  }),

  final(),
]);