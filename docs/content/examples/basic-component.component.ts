import { componentDiagram } from "@drawspec/uml-component";

export default componentDiagram("E-commerce microservices", (d) => {
  d.component("API Gateway", (c) => {
    c.provides("IRest");
    c.requires("IProductService");
    c.requires("IOrderService");
    c.requires("IPaymentService");
  });

  d.component("Product Service", (c) => {
    c.provides("IProductService");
    c.requires("IProductRepo");
  });

  d.component("Order Service", (c) => {
    c.provides("IOrderService");
    c.requires("IInventoryService");
  });

  d.component("Payment Service", (c) => {
    c.provides("IPaymentService");
  });

  d.component("Inventory Service", (c) => {
    c.provides("IInventoryService");
  });

  d.component("Product Repository", (c) => {
    c.provides("IProductRepo");
  });

  d.dependency("API Gateway", "Product Service");
  d.dependency("API Gateway", "Order Service");
  d.dependency("API Gateway", "Payment Service");
  d.dependency("Product Service", "Product Repository");
  d.dependency("Order Service", "Inventory Service");
});
