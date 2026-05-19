import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import {
  class_,
  classDiagram,
  compile,
  enum_,
  implements as implements_,
  interface_,
  uses,
} from "../index";

const payable = interface_("Payable", (i) =>
  i.method("pay", { visibility: "public" }).method("refund", { visibility: "public" })
);
const status = enum_("PaymentStatus", (e) =>
  e.value("Pending").value("Authorized").value("Captured").value("Failed")
);

function validPaymentElements() {
  return [
    class_("AggregateRoot"),
    payable,
    status,
    class_("Payment", (c) =>
      c
        .field("id", "string", { visibility: "private" })
        .field("status", "PaymentStatus")
        .method("authorize", { visibility: "public", returnType: "boolean" })
        .extends("AggregateRoot")
        .implements("Payable")
        .uses("PaymentStatus")
    ),
  ];
}

async function classSvg(): Promise<string> {
  const document = compile("Payment Class Diagram", validPaymentElements());
  const positionedDiagram = await simpleGraphLayout().layout(document, { direction: "LR" });
  return renderSvg(document, { positionedDiagram });
}

async function expectGolden(name: string, svg: string): Promise<void> {
  const path = new URL(`./golden/${name}.svg`, import.meta.url).pathname;
  if (Bun.env.UPDATE_GOLDEN === "1") {
    await Bun.write(path, svg);
  }
  expect(await Bun.file(path).text()).toBe(svg);
}

describe("@drawspec/uml-class", () => {
  test("compiles classes, fields, methods, inheritance, implements, and uses", () => {
    const document = compile("Payment Class Diagram", validPaymentElements());
    const payment = document.nodes.find((node) => node.label === "Payment");

    expect(document.kind).toBe("class");
    expect(payment?.kind).toBe("class");
    expect(payment?.metadata?.fields).toContainEqual(
      expect.objectContaining({ name: "id", type: "string", visibility: "private" })
    );
    expect(payment?.metadata?.methods).toContainEqual(
      expect.objectContaining({ name: "authorize", visibility: "public", returnType: "boolean" })
    );
    expect(document.edges.map((edge) => edge.kind).sort()).toEqual([
      "extends",
      "implements",
      "uses",
    ]);
    expect(document.diagnostics).toEqual([]);
  });

  test("compiles interfaces and enums as typed nodes", () => {
    const document = compile("Types", [payable, status]);

    expect(document.nodes.map((node) => node.kind).sort()).toEqual(["enum", "interface"]);
    expect(document.nodes.find((node) => node.kind === "enum")?.metadata).toMatchObject({
      values: ["Pending", "Authorized", "Captured", "Failed"],
    });
  });

  test("supports classDiagram and top-level relationship builders", () => {
    const document = classDiagram("Relationships", ({ class_, interface_, uses }) => [
      interface_("Repository", (i) => i.method("save", { visibility: "public" })),
      class_("SqlRepository", (c) => c.method("save", { visibility: "public" })),
      uses("SqlRepository", "Repository"),
      implements_("SqlRepository", "Repository"),
    ]);

    expect(document.edges.map((edge) => edge.kind).sort()).toEqual(["implements", "uses"]);
    expect(document.diagnostics).toEqual([]);
  });

  test("reports duplicate fields and methods in the same class", () => {
    const document = compile("Invalid", [
      class_("Payment", (c) =>
        c.field("status", "string").method("status", { visibility: "public", returnType: "string" })
      ),
    ]);

    expect(document.diagnostics?.map((diagnostic) => diagnostic.code)).toContain(
      "class/no-duplicate-member"
    );
  });

  test("requires method visibility", () => {
    const document = compile("Invalid", [class_("Payment", (c) => c.method("authorize"))]);

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "class/require-visibility", severity: "error" })
    );
  });

  test("detects circular inheritance", () => {
    const document = compile("Invalid", [
      class_("A", (c) => c.extends("B")),
      class_("B", (c) => c.extends("A")),
    ]);

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "class/no-circular-inheritance", severity: "error" })
    );
  });

  test("compiles deterministically", () => {
    const first = compile("Payment Class Diagram", validPaymentElements());
    const second = compile("Payment Class Diagram", validPaymentElements());

    expect(second).toEqual(first);
  });

  test("matches the class diagram golden fixture", async () => {
    await expectGolden("class", await classSvg());
  });

  test("reports unknown type references in explicit relationships", () => {
    const document = compile(
      "Invalid",
      [class_("Foo", (c) => c.method("bar", { visibility: "public" }))],
      [implements_("Foo", "NonExistent"), uses("AlsoMissing", "Foo")]
    );

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "class/no-unknown-type-ref", severity: "error" })
    );
  });
});
