import { componentDiagram, interface_ } from "../../../packages/uml-component/src/index.js";

export default componentDiagram("Microservices", ({ component, dependency, add }) => {
  add(interface_("HTTP API"));
  add(interface_("User Interface"));
  add(interface_("Database"));
  add(interface_("Order Interface"));
  add(interface_("Payment Gateway"));

  component("API Gateway", (c) => {
    c.provides("HTTP API");
  });

  component("User Service", (c) => {
    c.provides("User Interface");
    c.requires("Database");
  });

  component("Order Service", (c) => {
    c.provides("Order Interface");
    c.requires("Database");
    c.requires("Payment Gateway");
  });

  dependency("API Gateway", "User Service");
  dependency("API Gateway", "Order Service");
});
