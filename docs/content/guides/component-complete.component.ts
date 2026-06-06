import { componentDiagram, interface_ } from "../../../packages/uml-component/src/index.js";

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

  const webApp = component("Web Application", (c) => {
    c.provides("UserInterface");
    c.requires("APIGateway");
  });

  const apiGateway = component("API Gateway", (c) => {
    c.provides("RESTAPI");
    c.requires("AuthService");
    c.requires("BusinessLogic");
  });

  const authService = component("Auth Service", (c) => {
    c.provides("Authentication");
    c.requires("UserDatabase");
    c.requires("TokenService");
  });

  const businessLogic = component("Business Logic", (c) => {
    c.provides("OrderManagement");
    c.requires("OrderDatabase");
    c.requires("InventoryService");
  });

  const userDb = component("User Database");
  const orderDb = component("Order Database");
  const inventory = component("Inventory Service");

  dependency("Web Application", "API Gateway");
  dependency("API Gateway", "Auth Service");
  dependency("API Gateway", "Business Logic");
  dependency("Auth Service", "User Database");
  dependency("Business Logic", "Order Database");
  dependency("Business Logic", "Inventory Service");
});
