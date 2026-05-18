import { describe, expect, test } from "bun:test";
import { container, database, person, softwareSystem, workspace } from "../index";

const createPaymentsWorkspace = () =>
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

describe("architecture workspace", () => {
  test("creates person elements with correct kind", () => {
    const customer = person("Customer");
    expect(customer.kind).toBe("person");
    expect(customer.name).toBe("Customer");
    expect(customer.tags).toEqual(["person"]);
  });

  test("creates softwareSystem with containers", () => {
    const system = softwareSystem("Payment Platform");
    const web = system.add(container("Web App", { technology: "TypeScript" }));
    expect(system.kind).toBe("softwareSystem");
    expect(system.children).toEqual([web]);
    expect(web.parent).toBe(system);
  });

  test("creates database elements", () => {
    const ledger = database("Ledger", { technology: "PostgreSQL" });
    expect(ledger.kind).toBe("database");
    expect(ledger.technology).toBe("PostgreSQL");
  });
  test("element.uses creates relationships with technology and tags", () => {
    const ws = workspace("Rel", (w) => {
      const user = w.model.add(person("User"));
      const app = w.model.add(softwareSystem("App"));
      user.uses(app, "Uses", { technology: "HTTPS", protocol: "HTTP", tags: ["sync"] });
    });

    expect(ws.model.relationships).toHaveLength(1);
    expect(ws.model.relationships[0]?.technology).toBe("HTTPS");
    expect(ws.model.relationships[0]?.metadata).toEqual({ protocol: "HTTP", technology: "HTTPS" });
    expect(ws.model.relationships[0]?.tags).toEqual(["relationship", "sync"]);
  });

  test("workspace supports curried initializer form", () => {
    const ws = workspace("Curried")(({ model }) => {
      model.add(person("Customer"));
    });
    expect(ws.model.elements).toHaveLength(1);
  });

  test("nested workspace via model.use composes correctly", () => {
    const shared = workspace("Shared", (w) => {
      w.model.add(person("Support"));
    });
    const host = workspace("Host", (w) => {
      const app = w.model.add(softwareSystem("App"));
      w.model.use(shared.model);
      w.views.systemContext(app, "ctx", (v) => v.include("*"));
    });

    const [doc] = host.compile();
    expect(doc?.nodes.some((node) => node.label === "Support")).toBe(true);
  });
  test("deterministic IDs across runs", () => {
    const first = createPaymentsWorkspace().compile();
    const second = createPaymentsWorkspace().compile();
    expect(first).toEqual(second);
  });

  test("auto-generated IDs do not collide", () => {
    const ws = workspace("Collisions", (w) => {
      w.model.add(person("User"));
      w.model.add(person("User"));
    });
    expect(ws.model.elements.map((element) => element.id)).toHaveLength(2);
    expect(new Set(ws.model.elements.map((element) => element.id)).size).toBe(2);
  });
});

export { createPaymentsWorkspace };
