import { describe, expect, test } from "bun:test";
import { sequence } from "../../../uml-sequence/src";
import { container, generateDynamicView, person, softwareSystem, workspace } from "../index";

describe("dynamic architecture views", () => {
  test("generates a runtime interaction path from sequence model references", () => {
    const ws = workspace("Checkout", (w) => {
      const customer = w.model.add(person("Customer", { id: "person:customer" }));
      const platform = w.model.add(softwareSystem("Payment Platform", { id: "system:payments" }));
      const web = platform.add(container("Web", { id: "container:web" }));
      const api = platform.add(container("API", { id: "container:api" }));

      customer.uses(web, "Uses checkout");
      web.uses(api, "Submits payment");
    });
    const doc = sequence("Checkout payment", (s) => {
      const customer = s.actor("Customer", { modelRef: "person:customer" });
      const web = s.participant("Web", { modelRef: "container:web" });
      const api = s.participant("API", { modelRef: "container:api" });

      customer.to(web, "Open checkout");
      web.to(api, "Create payment");
    });

    const dynamic = generateDynamicView(ws, doc);

    expect(dynamic.kind).toBe("dynamic");
    expect(dynamic.metadata).toMatchObject({ viewKind: "dynamic", sequenceId: doc.id });
    expect(dynamic.nodes.map((node) => node.id).sort()).toEqual([
      "container:api",
      "container:web",
      "person:customer",
    ]);
    expect(dynamic.edges.map((edge) => edge.label)).toEqual(["Open checkout", "Create payment"]);
    expect(dynamic.edges[0]?.metadata?.["sequenceMessageId"]).toBe(doc.edges[0]?.id);
    expect(dynamic.edges[0]?.metadata?.["relationshipId"]).toBe(ws.model.relationships[0]?.id);
    expect(dynamic.diagnostics).toBeUndefined();
  });

  test("reports unknown model references", () => {
    const ws = workspace("Unknown", (w) => {
      w.model.add(person("Customer", { id: "person:customer" }));
    });
    const doc = sequence("Missing", (s) => {
      const customer = s.actor("Customer", { modelRef: "person:customer" });
      const api = s.participant("API", { modelRef: "container:missing" });

      customer.to(api, "Call");
    });

    const dynamic = generateDynamicView(ws, doc);

    expect(dynamic.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "DS_ARCH_DYNAMIC_INVALID_REFERENCE",
        message: expect.stringContaining("container:missing"),
        severity: "error",
      })
    );
    expect(dynamic.edges).toHaveLength(0);
  });

  test("validates sequence messages against architecture relationships", () => {
    const ws = workspace("Mismatch", (w) => {
      w.model.add(person("Customer", { id: "person:customer" }));
      w.model.add(softwareSystem("API", { id: "system:api" }));
    });
    const doc = sequence("Mismatched", (s) => {
      const customer = s.actor("Customer", { modelRef: "person:customer" });
      const api = s.participant("API", { modelRef: "system:api" });

      customer.to(api, "Call");
    });

    const dynamic = generateDynamicView(ws, doc);

    expect(dynamic.edges).toHaveLength(1);
    expect(dynamic.edges[0]?.metadata?.["relationshipId"]).toBeUndefined();
    expect(dynamic.diagnostics).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("no matching architecture relationship"),
        target: doc.edges[0]?.id,
      })
    );
  });

  test("compiles dynamic view builders as dynamic diagram documents", () => {
    const ws = workspace("Builder", (w) => {
      const customer = w.model.add(person("Customer", { id: "person:customer" }));
      const api = w.model.add(softwareSystem("API", { id: "system:api" }));

      w.views.dynamic(customer, "checkout-flow", (view) => {
        view.addInteraction({
          id: "interaction:checkout",
          label: "Checkout",
          sequenceMessageId: "message:checkout",
          sourceId: customer.id,
          targetId: api.id,
        });
      });
    });

    const [doc] = ws.compile();

    expect(doc?.kind).toBe("dynamic");
    expect(doc?.edges).toEqual([
      expect.objectContaining({
        id: "interaction:checkout",
        kind: "dynamic-message",
        metadata: { sequenceMessageId: "message:checkout" },
      }),
    ]);
    expect(doc?.metadata?.["interactions"]).toEqual([
      expect.objectContaining({ sequenceMessageId: "message:checkout" }),
    ]);
  });
});
