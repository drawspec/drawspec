import { sequence } from "@drawspec/uml-sequence";
import { classDiagram, class_, interface_ } from "@drawspec/uml-class";
import { exportToMermaid } from "@drawspec/exporter-mermaid";

/**
 * Demonstrates exporting DrawSpec diagrams to Mermaid syntax.
 *
 * Usage: bun run src/export-mermaid.ts
 */
function exportMermaid() {
  // Export a sequence diagram.
  const seqDoc = sequence("Checkout Flow", (s) => {
    const user = s.actor("User");
    const cart = s.participant("Cart");
    const payment = s.participant("Payment");

    user.to(cart, "Checkout");
    cart.to(payment, "Charge $29.99");
    payment.to(cart, "Success");
    cart.to(user, "Order confirmed");
  });

  const seqMermaid = exportToMermaid(seqDoc);
  console.log("=== Sequence Diagram -> Mermaid ===");
  console.log(seqMermaid);
  console.log();

  // Export a class diagram.
  const classDoc = classDiagram("Domain Model", (api) => {
    const user = api.class_("User");
    const order = api.class_("Order");
    const product = api.class_("Product");
    return [
      user,
      order,
      product,
      api.uses("User", "Order"),
      api.uses("Order", "Product"),
    ];
  });

  const classMermaid = exportToMermaid(classDoc);
  console.log("=== Class Diagram -> Mermaid ===");
  console.log(classMermaid);
}

exportMermaid();
