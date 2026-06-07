import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { compile, object, objectDiagram } from "../index";
import { link } from "../link";

function validObjectElements() {
  const user1 = object("user1", { className: "User" }, (o) =>
    o.attribute("name", "Alice").attribute("age", "30")
  );
  const order1 = object("order1", { className: "Order" }, (o) =>
    o.attribute("total", "$99.99").attribute("status", "pending")
  );
  const userOrderLink = link("user1", "order1", {
    label: "places",
    sourceMultiplicity: "1",
    targetMultiplicity: "*",
  });
  return { instances: [user1, order1], links: [userOrderLink] };
}

async function objectSvg(): Promise<string> {
  const { instances, links } = validObjectElements();
  const document = compile("Object Diagram", instances, links);
  const positionedDiagram = await simpleGraphLayout().layout(document, { direction: "TB" });
  return renderSvg(document, { positionedDiagram });
}

async function expectGolden(name: string, svg: string): Promise<void> {
  const path = new URL(`./golden/${name}.svg`, import.meta.url).pathname;
  if (Bun.env.UPDATE_GOLDEN === "1") {
    await Bun.write(path, svg);
  }
  expect(await Bun.file(path).text()).toBe(svg);
}

describe("@drawspec/uml-object", () => {
  test("compiles object instances to IR nodes with compartments", () => {
    const { instances, links } = validObjectElements();
    const document = compile("Object Diagram", instances, links);
    const userNode = document.nodes.find((n) => n.label === "user1: User");

    expect(document.kind).toBe("object");
    expect(document.nodes).toHaveLength(2);
    expect(userNode?.kind).toBe("object");
    expect(userNode?.compartments).toHaveLength(2); // name + attributes
  });

  test("compiles attributes as compartment lines with member role", () => {
    const { instances, links } = validObjectElements();
    const document = compile("Object Diagram", instances, links);
    const userNode = document.nodes.find((n) => n.metadata?.objectName === "user1");
    const attrCompartment = userNode?.compartments?.find((c) => c.id?.includes("attributes"));

    expect(attrCompartment?.lines).toHaveLength(2);
    expect(attrCompartment?.lines[0]?.text).toBe("name: Alice");
    expect(attrCompartment?.lines[0]?.role).toBe("member");
  });

  test("compiles object without class name", () => {
    const inst = object("anonymousObj", undefined, (o) => o.attribute("key", "value"));
    const document = compile("No Class", [inst]);
    const node = document.nodes[0];

    expect(node?.label).toBe("anonymousObj");
    expect(node?.metadata?.className).toBeUndefined();
  });

  test("compiles links to IR edges with correct kind", () => {
    const { instances, links } = validObjectElements();
    const document = compile("Object Diagram", instances, links);
    const edge = document.edges[0];

    expect(document.edges).toHaveLength(1);
    expect(edge?.kind).toBe("link");
    expect(edge?.direction).toBe("none");
    expect(edge?.label).toBe("places");
  });

  test("link stores multiplicity in metadata", () => {
    const { instances, links } = validObjectElements();
    const document = compile("Object Diagram", instances, links);
    const edge = document.edges[0];

    expect(edge?.metadata?.sourceMultiplicity).toBe("1");
    expect(edge?.metadata?.targetMultiplicity).toBe("*");
  });

  test("reports duplicate object names", () => {
    const document = compile("Invalid", [
      object("obj1", { className: "A" }),
      object("obj1", { className: "B" }),
    ]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("object/no-duplicate-name");
  });

  test("reports unknown object references in links", () => {
    const document = compile(
      "Invalid",
      [object("a", { className: "A" })],
      [link("a", "nonexistent")]
    );

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "object/no-unknown-ref", severity: "error" })
    );
  });

  test("compiles deterministically", () => {
    const { instances, links } = validObjectElements();
    const first = compile("Object Diagram", instances, links);
    const second = compile("Object Diagram", instances, links);

    expect(second).toEqual(first);
  });

  test("objectDiagram DSL produces valid document", () => {
    const doc = objectDiagram("System", (dsl) => [
      dsl.object("user1", { className: "User" }, (o) => o.attribute("name", "Alice")),
      dsl.object("order1", { className: "Order" }, (o) => o.attribute("total", "$50")),
      dsl.link("user1", "order1", { label: "places" }),
    ]);

    expect(doc.kind).toBe("object");
    expect(doc.nodes).toHaveLength(2);
    expect(doc.edges).toHaveLength(1);
    expect(doc.diagnostics).toEqual([]);
  });

  test("object name is underlined via metadata", () => {
    const { instances } = validObjectElements();
    const document = compile("Object Diagram", instances);
    const node = document.nodes[0];

    expect(node?.metadata?.underlined).toBe(true);
  });

  test("matches the object diagram golden fixture", async () => {
    await expectGolden("object", await objectSvg());
  });
});
