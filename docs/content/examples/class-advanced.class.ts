import { classDiagram, class_, interface_, enum_, implements as implements_, uses } from "../../../packages/uml-class/src/index.js";

export default classDiagram("Vehicle system", ({ class_, interface_, enum_, implements, uses }) => [
  interface_("IDriveable", (i) => {
    i.method("start", { visibility: "public" });
    i.method("stop", { visibility: "public" });
    i.method("moveTo", { visibility: "public", parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }] });
  }),

  interface_("IRepository", (i) => {
    i.method("save", { visibility: "public" });
    i.method("delete", { visibility: "public", parameters: [{ name: "id", type: "string" }] });
    i.method("findById", { visibility: "public", returnType: "unknown", parameters: [{ name: "id", type: "string" }] });
  }),

  enum_("VehicleStatus", (e) => {
    e.value("Idle");
    e.value("Moving");
    e.value("Maintenance");
    e.value("Decommissioned");
  }),

  class_("Engine", (c) => {
    c.field("horsepower", "number");
    c.field("fuelType", "string");
    c.method("ignite", { visibility: "private" });
    c.method("shutdown", { visibility: "private" });
  }),

  class_("Vehicle", (c) => {
    c.field("id", "string");
    c.field("make", "string");
    c.field("model", "string");
    c.field("engine", "Engine");
    c.method("start", { visibility: "public" });
    c.method("stop", { visibility: "public" });
    c.method("moveTo", { visibility: "public", parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }] });
    c.implements("IDriveable");
  }),

  class_("Car", (c) => {
    c.field("numDoors", "number");
    c.field("isElectric", "boolean");
    c.extends("Vehicle");
    c.method("openTrunk", { visibility: "public" });
  }),

  class_("Truck", (c) => {
    c.field("loadCapacity", "number");
    c.field("bedLength", "number");
    c.extends("Vehicle");
    c.method("attachTrailer", { visibility: "public" });
  }),

  class_("VehicleRepository", (c) => {
    c.method("save", { visibility: "public" });
    c.method("delete", { visibility: "public", parameters: [{ name: "id", type: "string" }] });
    c.method("findById", { visibility: "public", returnType: "Vehicle", parameters: [{ name: "id", type: "string" }] });
    c.implements("IRepository");
    c.uses("Vehicle");
  }),

  uses("Vehicle", "Engine"),
  uses("Car", "Vehicle"),
  uses("Truck", "Vehicle"),
]);