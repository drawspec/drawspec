import { describe, expect, test } from "bun:test";
import { container, database, person, softwareSystem, workspace } from "../index";
import { createPaymentsWorkspace } from "./fixtures";

describe("architecture compilation", () => {
  test("Payments workspace example compiles to valid architecture IR", () => {
    const docs = createPaymentsWorkspace().compile();
    expect(docs).toHaveLength(2);
    expect(docs.every((doc) => doc.kind === "architecture")).toBe(true);
    expect(docs.every((doc) => doc.schemaVersion === "1.0")).toBe(true);
  });

  test("systemContext view includes correct elements", () => {
    const systemDoc = createPaymentsWorkspace()
      .compile()
      .find((doc) => doc.title === "system");
    expect(systemDoc?.nodes.map((node) => node.label).sort()).toEqual([
      "Customer",
      "Payment Platform",
    ]);
    expect(systemDoc?.layout).toEqual({ engine: "auto", direction: "lr" });
  });
  test("container view includes correct sub-elements", () => {
    const containerDoc = createPaymentsWorkspace()
      .compile()
      .find((doc) => doc.title === "containers");
    expect(containerDoc?.nodes.map((node) => node.label).sort()).toEqual([
      "API",
      "Customer",
      "Ledger",
      "Payment Platform",
      "Web App",
    ]);
    expect(containerDoc?.edges.map((edge) => edge.label).sort()).toEqual([
      "Creates payment",
      "Stores transaction",
      "Submits payment",
    ]);
    expect(containerDoc?.layout).toEqual({ engine: "auto", direction: "tb" });
  });

  test("styles apply to elements and relationships", () => {
    const ws = workspace("Styled", (w) => {
      const user = w.model.add(person("User", { tags: ["external"] }));
      const app = w.model.add(softwareSystem("App", { tags: ["internal"] }));
      user.uses(app, "Calls", { tags: ["async"] });
      w.styles.element("external", { fill: "#fff" });
      w.styles.relationship("async", { line: "dashed" });
      w.views.systemContext(app, "ctx", (v) => v.include(user));
    });

    const [doc] = ws.compile();
    expect(doc?.styles?.rules?.["element:external"]).toEqual({ fill: "#fff" });
    expect(doc?.styles?.rules?.["relationship:async"]).toEqual({ line: "dashed" });
  });

  test("software systems with containers compile to groups", () => {
    const doc = createPaymentsWorkspace()
      .compile()
      .find((candidate) => candidate.title === "containers");
    expect(doc?.groups).toHaveLength(1);
    expect(doc?.groups[0]?.label).toBe("Payment Platform");
    expect(doc?.groups[0]?.childIds).toHaveLength(3);
  });

  test("nodes include metadata for technology", () => {
    const doc = createPaymentsWorkspace()
      .compile()
      .find((candidate) => candidate.title === "containers");
    const api = doc?.nodes.find((node) => node.label === "API");
    expect(api?.kind).toBe("container");
    expect(api?.metadata).toEqual({ technology: "Bun" });
  });

  test("relationship metadata contains technology and protocol", () => {
    const ws = workspace("Protocol", (w) => {
      const api = w.model.add(container("API"));
      const ledger = w.model.add(database("Ledger"));
      api.uses(ledger, "Stores", { technology: "SQL", protocol: "PostgreSQL Wire" });
      w.views.systemContext(api, "ctx", (v) => v.include(ledger));
    });

    const [doc] = ws.compile();
    expect(doc?.edges[0]?.metadata).toEqual({ protocol: "PostgreSQL Wire", technology: "SQL" });
  });
});
