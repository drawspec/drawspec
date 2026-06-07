import { componentDiagram, interface_ } from "@drawspec/uml-component";

export default componentDiagram("Web application", ({ component, dependency, add }) => {
  add(interface_("UserInterface"));
  add(interface_("APIGateway"));
  add(interface_("RESTAPI"));
  add(interface_("AuthService"));
  add(interface_("BusinessLogic"));
  add(interface_("Authentication"));
  add(interface_("UserDatabase"));
  add(interface_("TokenService"));
  add(interface_("OrderManagement"));
  add(interface_("OrderDatabase"));
  add(interface_("InventoryService"));

  component("Web Application", (c) => {
    c.provides("UserInterface");
    c.requires("APIGateway");
  });

  component("API Gateway", (c) => {
    c.provides("RESTAPI");
    c.requires("AuthService");
    c.requires("BusinessLogic");
  });

  component("Auth Service", (c) => {
    c.provides("Authentication");
    c.requires("UserDatabase");
    c.requires("TokenService");
  });

  component("Business Logic", (c) => {
    c.provides("OrderManagement");
    c.requires("OrderDatabase");
    c.requires("InventoryService");
  });

  component("User Database");
  component("Order Database");
  component("Inventory Service");

  dependency("Web Application", "API Gateway");
  dependency("API Gateway", "Auth Service");
  dependency("API Gateway", "Business Logic");
  dependency("Auth Service", "User Database");
  dependency("Business Logic", "Order Database");
  dependency("Business Logic", "Inventory Service");
});
