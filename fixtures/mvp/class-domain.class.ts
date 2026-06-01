import { class_, classDiagram, interface_ } from "../../packages/uml-class/src";

export default classDiagram("User domain model", ({ uses }) => [
  interface_("Repository", (i) =>
    i.method("findById", {
      visibility: "public",
      returnType: "User | undefined",
      parameters: [{ name: "id", type: "string" }],
    })
  ),
  class_("User", (c) =>
    c
      .field("id", "string", { visibility: "private", readonly: true })
      .field("email", "string", { visibility: "private" })
      .method("changeEmail", {
        visibility: "public",
        returnType: "void",
        parameters: [{ name: "email", type: "string" }],
      })
  ),
  class_("Admin", (c) =>
    c
      .field("permissions", "string[]", { visibility: "private" })
      .method("disableUser", {
        visibility: "public",
        returnType: "void",
        parameters: [{ name: "user", type: "User" }],
      })
      .extends("User")
  ),
  class_("UserRepository", (c) =>
    c
      .method("findById", {
        visibility: "public",
        returnType: "User | undefined",
        parameters: [{ name: "id", type: "string" }],
      })
      .implements("Repository")
      .uses("User")
  ),
  class_("AuthService", (c) =>
    c
      .method("authenticate", {
        visibility: "public",
        returnType: "User",
        parameters: [{ name: "token", type: "string" }],
      })
      .uses("UserRepository")
  ),
  uses("AuthService", "Repository"),
]);
