import { classDiagram } from "@drawspec/uml-class";

export default classDiagram("Animal hierarchy", ({ class_ }) => [
  class_("Animal", (c) => {
    c.field("name", "string");
    c.field("age", "number");
    c.method("speak", { returnType: "string" });
  }),
  class_("Dog", (c) => {
    c.extends("Animal");
    c.method("bark", { returnType: "string" });
  }),
]);
