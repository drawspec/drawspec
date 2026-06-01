import { classDiagram } from "../../../packages/uml-class/src/index.js";

export default classDiagram("User management", ({ class_, interface_, enum_, implements, uses }) => [
  class_("User", (c) => {
    c.field("id", "string");
    c.field("email", "string");
    c.field("createdAt", "Date");
    c.method("getEmail", { returnType: "string", visibility: "public" });
    c.method("updateEmail", { visibility: "public", parameters: [{ name: "email", type: "string" }] });
  }),

  class_("Admin", (c) => {
    c.field("role", "string");
    c.extends("User");
    c.method("banUser", { visibility: "public", parameters: [{ name: "userId", type: "string" }] });
    c.method("impersonate", { visibility: "public", returnType: "User" });
  }),

  class_("Session", (c) => {
    c.field("token", "string");
    c.field("expiresAt", "Date");
    c.method("isValid", { visibility: "public", returnType: "boolean" });
    c.method("refresh", { visibility: "public" });
  }),

  interface_("Repository", (i) => {
    i.method("save", { visibility: "public" });
    i.method("findById", { visibility: "public", parameters: [{ name: "id", type: "string" }] });
  }),

  enum_("UserRole", (e) => {
    e.value("Member");
    e.value("Admin");
    e.value("Guest");
  }),

  implements("Admin", "Repository"),
  uses("Session", "Repository"),
]);
