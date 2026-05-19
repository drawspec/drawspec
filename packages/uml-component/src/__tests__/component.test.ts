import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { componentDiagram, interface_, provides, requires } from "../index";

describe("componentDiagram", () => {
  test("creates components and interfaces with the expected document kind", () => {
    const doc = componentDiagram("System Architecture", (d) => {
      d.component("OrderService", (c) => c.provides("IOrderService"));
      d.add(interface_("IOrderService"));
    });

    expect(doc.kind).toBe("component");
    expect(doc.nodes.map((node) => ({ kind: node.kind, label: node.label }))).toEqual([
      { kind: "component", label: "OrderService" },
      { kind: "interface", label: "IOrderService" },
    ]);
  });

  test("component provides and requires compile to lollipop interface edges", () => {
    const doc = componentDiagram("Ports", (d) => {
      d.component("OrderService", (c) => c.provides("IOrderService").requires("IPaymentGateway"));
      d.add(interface_("IOrderService"));
      d.add(interface_("IPaymentGateway"));
    });

    expect(doc.edges.map((edge) => edge.kind)).toEqual(["provides", "requires"]);
    expect(doc.edges[0]).toMatchObject({ sourceId: doc.nodes[0]?.id, targetId: doc.nodes[1]?.id });
    expect(doc.edges[1]).toMatchObject({ sourceId: doc.nodes[0]?.id, targetId: doc.nodes[2]?.id });
  });

  test("dependency builder links component nodes by name", () => {
    const doc = componentDiagram("Dependencies", (d) => {
      d.component("OrderService");
      d.component("PaymentGateway");
      d.dependency("OrderService", "PaymentGateway");
    });

    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0]).toMatchObject({
      kind: "dependency",
      sourceId: doc.nodes[0]?.id,
      targetId: doc.nodes[1]?.id,
      direction: "forward",
    });
  });

  test("top-level provides and requires builders compile to interface edges", () => {
    const doc = componentDiagram("Explicit ports", (d) => {
      d.component("OrderService");
      d.add(interface_("IOrderService"));
      d.add(interface_("IPaymentGateway"));
      d.add(provides("OrderService", "IOrderService"));
      d.add(requires("OrderService", "IPaymentGateway"));
    });

    expect(doc.edges.map((edge) => edge.kind)).toEqual(["provides", "requires"]);
  });

  test("reports diagnostics for self dependencies and unknown component references", () => {
    const doc = componentDiagram("Invalid", (d) => {
      d.component("OrderService");
      d.dependency("OrderService", "OrderService");
      d.dependency("OrderService", "Missing");
    });

    expect(doc.edges).toHaveLength(0);
    expect(doc.diagnostics?.map((item) => item.code)).toEqual([
      "no-self-dependency",
      "no-unknown-component-ref",
    ]);
  });

  test("reports diagnostics for unknown provided/required interfaces", () => {
    const doc = componentDiagram("Unknown Interfaces", (d) => {
      d.component("OrderService", (c) => c.provides("IMissing").requires("IGone"));
    });

    expect(doc.diagnostics?.map((item) => item.code)).toEqual([
      "component/no-unknown-component-ref",
      "component/no-unknown-component-ref",
    ]);
  });

  test("deduplicates interface refs per component", () => {
    const doc = componentDiagram("Dedup", (d) => {
      d.component("Svc", (c) => c.provides("IFoo").provides("IFoo"));
      d.add(interface_("IFoo"));
    });

    const providesEdges = doc.edges.filter((e) => e.kind === "provides");
    expect(providesEdges).toHaveLength(1);
  });

  test("produces deterministic DiagramDocument IDs across runs", () => {
    const build = () =>
      componentDiagram("Stable", (d) => {
        d.component("OrderService", (c) => c.provides("IOrderService"));
        d.add(interface_("IOrderService"));
      });

    expect(build()).toEqual(build());
  });

  test("component diagrams can be laid out and rendered through workspace packages", async () => {
    const doc = componentDiagram("Renderable", (d) => {
      d.component("OrderService", (c) => c.requires("IPaymentGateway"));
      d.component("PaymentGateway", (c) => c.provides("IPaymentGateway"));
      d.add(interface_("IPaymentGateway"));
      d.dependency("OrderService", "PaymentGateway");
    });
    const positionedDiagram = await simpleGraphLayout().layout(doc);
    const svg = await renderSvg(doc, { positionedDiagram });

    expect(positionedDiagram.nodes).toHaveLength(3);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Renderable");
  });
});
