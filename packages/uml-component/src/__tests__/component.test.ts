import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { component, componentDiagram, dependency, interface_, provides, requires } from "../index";

describe("componentDiagram", () => {
  test("creates components and interfaces with the expected document kind", () => {
    const doc = componentDiagram("System Architecture", () => [
      component("OrderService", (c) => c.provides("IOrderService")),
      interface_("IOrderService"),
    ]);

    expect(doc.kind).toBe("component");
    expect(doc.nodes.map((node) => ({ kind: node.kind, label: node.label }))).toEqual([
      { kind: "component", label: "OrderService" },
      { kind: "interface", label: "IOrderService" },
    ]);
  });

  test("component provides and requires compile to lollipop interface edges", () => {
    const doc = componentDiagram("Ports", () => [
      component("OrderService", (c) => c.provides("IOrderService").requires("IPaymentGateway")),
      interface_("IOrderService"),
      interface_("IPaymentGateway"),
    ]);

    expect(doc.edges.map((edge) => edge.kind)).toEqual(["provides", "requires"]);
    expect(doc.edges[0]).toMatchObject({ sourceId: doc.nodes[0]?.id, targetId: doc.nodes[1]?.id });
    expect(doc.edges[1]).toMatchObject({ sourceId: doc.nodes[0]?.id, targetId: doc.nodes[2]?.id });
  });

  test("dependency builder links component nodes by name", () => {
    const doc = componentDiagram("Dependencies", () => [
      component("OrderService"),
      component("PaymentGateway"),
      dependency("OrderService", "PaymentGateway"),
    ]);

    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0]).toMatchObject({
      kind: "dependency",
      sourceId: doc.nodes[0]?.id,
      targetId: doc.nodes[1]?.id,
      direction: "forward",
    });
  });

  test("top-level provides and requires builders compile to interface edges", () => {
    const doc = componentDiagram("Explicit ports", () => [
      component("OrderService"),
      interface_("IOrderService"),
      interface_("IPaymentGateway"),
      provides("OrderService", "IOrderService"),
      requires("OrderService", "IPaymentGateway"),
    ]);

    expect(doc.edges.map((edge) => edge.kind)).toEqual(["provides", "requires"]);
  });

  test("reports diagnostics for self dependencies and unknown component references", () => {
    const doc = componentDiagram("Invalid", () => [
      component("OrderService"),
      dependency("OrderService", "OrderService"),
      dependency("OrderService", "Missing"),
    ]);

    expect(doc.edges).toHaveLength(0);
    expect(doc.diagnostics?.map((item) => item.code)).toEqual([
      "no-self-dependency",
      "no-unknown-component-ref",
    ]);
  });

  test("produces deterministic DiagramDocument IDs across runs", () => {
    const build = () =>
      componentDiagram("Stable", () => [
        component("OrderService", (c) => c.provides("IOrderService")),
        interface_("IOrderService"),
      ]);

    expect(build()).toEqual(build());
  });

  test("component diagrams can be laid out and rendered through workspace packages", async () => {
    const doc = componentDiagram("Renderable", () => [
      component("OrderService", (c) => c.requires("IPaymentGateway")),
      component("PaymentGateway", (c) => c.provides("IPaymentGateway")),
      interface_("IPaymentGateway"),
      dependency("OrderService", "PaymentGateway"),
    ]);
    const positionedDiagram = await simpleGraphLayout().layout(doc);
    const svg = await renderSvg(doc, { positionedDiagram });

    expect(positionedDiagram.nodes).toHaveLength(3);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Renderable");
  });
});
