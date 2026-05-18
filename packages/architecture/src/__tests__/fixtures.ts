import { container, database, person, softwareSystem, workspace } from "../index";

export const createPaymentsWorkspace = () =>
  workspace("Payments", (w) => {
    const customer = w.model.add(person("Customer"));
    const payments = w.model.add(
      softwareSystem("Payment Platform", {
        description: "Processes payments",
        tags: ["internal"],
      })
    );
    const web = payments.add(container("Web App", { technology: "TypeScript" }));
    const api = payments.add(container("API", { technology: "Bun" }));
    const ledger = payments.add(database("Ledger", { technology: "PostgreSQL" }));

    customer.uses(web, "Creates payment", { technology: "HTTPS" });
    web.uses(api, "Submits payment", { technology: "REST" });
    api.uses(ledger, "Stores transaction", { technology: "SQL", tags: ["writes"] });

    w.views.systemContext(payments, "system", (v) => {
      v.include(customer);
      v.autoLayout("left-right");
    });

    w.views.container(payments, "containers", (v) => {
      v.include(customer);
      v.autoLayout("top-down");
    });
  });
