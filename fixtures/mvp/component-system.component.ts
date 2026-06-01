import { componentDiagram, interface_ } from "../../packages/uml-component/src";

export default componentDiagram("Commerce microservices", (d) => {
  d.component("Web App", (c) => c.requires("Order API"));
  d.component("Order Service", (c) =>
    c.provides("Order API").requires("Payment API").requires("Inventory API")
  );
  d.component("Payment Service", (c) => c.provides("Payment API"));
  d.component("Inventory Service", (c) => c.provides("Inventory API"));

  d.add(interface_("Order API"));
  d.add(interface_("Payment API"));
  d.add(interface_("Inventory API"));

  d.dependency("Web App", "Order Service", "HTTP commands");
  d.dependency("Order Service", "Payment Service", "Authorize payment");
  d.dependency("Order Service", "Inventory Service", "Reserve stock");
});
