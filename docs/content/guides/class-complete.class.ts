import { classDiagram } from "../../../packages/uml-class/src/index.js";

export default classDiagram("Payment system", ({ class_, interface_, enum_ }) => [
  interface_("PaymentMethod", (i) => {
    i.method("process", { parameters: [{ name: "amount", type: "number" }], returnType: "boolean" });
    i.method("refund", { parameters: [{ name: "transactionId", type: "string" }], returnType: "boolean" });
  }),

  enum_("Currency", (e) => {
    e.value("USD");
    e.value("EUR");
    e.value("GBP");
  }),

  class_("Payment", (c) => {
    c.field("id", "string", { readonly: true });
    c.field("amount", "number");
    c.field("currency", "Currency");
    c.field("status", "string");
    c.method("capture", { returnType: "Promise<boolean>" });
  }),

  class_("CreditCard", (c) => {
    c.implements("PaymentMethod");
    c.field("cardNumber", "string", { visibility: "private" });
    c.field("expiryMonth", "number");
    c.field("expiryYear", "number");
    c.method("process", { returnType: "boolean" });
  }),

  class_("PayPal", (p) => {
    p.implements("PaymentMethod");
    p.field("email", "string");
    p.method("process", { returnType: "boolean" });
  }),

  class_("PaymentProcessor", (p) => {
    p.field("strategies", "Map<string, PaymentMethod>");
    p.method("register", { parameters: [{ name: "name", type: "string" }, { name: "method", type: "PaymentMethod" }] });
    p.method("process", { parameters: [{ name: "type", type: "string" }, { name: "amount", type: "number" }], returnType: "Promise<boolean>" });
  }),
]);
