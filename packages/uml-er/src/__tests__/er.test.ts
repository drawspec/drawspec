import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { compile, entity, erDiagram, relationship } from "../index";

const user = entity("User", (e) =>
  e
    .pk("id", "UUID")
    .attribute("email", "VARCHAR(255)", { nullable: false })
    .attribute("name", "VARCHAR(100)")
);

const order = entity("Order", (e) =>
  e
    .pk("id", "UUID")
    .fk("userId", "UUID")
    .attribute("total", "DECIMAL(10,2)")
    .attribute("status", "VARCHAR(20)")
);

const item = entity("OrderItem", (e) =>
  e.pk("id", "UUID").fk("orderId", "UUID").fk("productId", "UUID").attribute("quantity", "INT")
);

function validErElements() {
  return {
    entities: [user, order, item],
    relationships: [
      relationship("User", "Order", {
        sourceCardinality: "1",
        targetCardinality: "*",
        name: "places",
      }),
      relationship("Order", "OrderItem", {
        sourceCardinality: "1",
        targetCardinality: "*",
        name: "contains",
      }),
    ],
  };
}

async function erSvg(): Promise<string> {
  const { entities, relationships } = validErElements();
  const document = compile("E-Commerce ER", entities, relationships);
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

describe("@drawspec/uml-er", () => {
  test("compiles entities with attributes to IR nodes", () => {
    const { entities, relationships } = validErElements();
    const document = compile("E-Commerce ER", entities, relationships);
    const userNode = document.nodes.find((n) => n.label === "User");

    expect(document.kind).toBe("er");
    expect(document.nodes).toHaveLength(3);
    expect(userNode?.kind).toBe("entity");
    const attrCompartment = userNode?.compartments?.find(
      (c) => c.id === `${userNode.id}:attributes`
    );
    expect(attrCompartment?.lines).toContainEqual(
      expect.objectContaining({ text: expect.stringContaining("+ id: UUID [PK]") })
    );
    expect(attrCompartment?.lines).toContainEqual(
      expect.objectContaining({ text: "+ email: VARCHAR(255)" })
    );
  });

  test("compiles relationships with cardinality to IR edges", () => {
    const { entities, relationships } = validErElements();
    const document = compile("E-Commerce ER", entities, relationships);
    const placesEdge = document.edges.find((e) => e.label === "places");

    expect(document.edges).toHaveLength(2);
    expect(placesEdge?.kind).toBe("relationship");
    expect(placesEdge?.direction).toBe("none");
    expect(placesEdge?.metadata?.sourceCardinality).toBe("1");
    expect(placesEdge?.metadata?.targetCardinality).toBe("*");
  });

  test("erDiagram DSL produces same output as compile", () => {
    const _fromCompile = compile(
      "E-Commerce ER",
      [user, order, item],
      [
        relationship("User", "Order", {
          sourceCardinality: "1",
          targetCardinality: "*",
          name: "places",
        }),
      ]
    );

    const fromBuilder = erDiagram("E-Commerce ER", ({ entity, relationship }) => [
      entity("User", (e) => e.pk("id", "UUID").attribute("email", "VARCHAR(255)")),
      entity("Order", (e) => e.pk("id", "UUID").fk("userId", "UUID")),
      relationship("User", "Order", {
        sourceCardinality: "1",
        targetCardinality: "*",
        name: "places",
      }),
    ]);

    expect(fromBuilder.kind).toBe("er");
    expect(fromBuilder.nodes).toHaveLength(2);
    expect(fromBuilder.edges).toHaveLength(1);
    expect(fromBuilder.edges[0]?.label).toBe("places");
    expect(fromBuilder.diagnostics).toEqual([]);
  });

  test("reports duplicate entity names", () => {
    const document = compile("Invalid", [
      entity("User", (e) => e.pk("id", "UUID")),
      entity("User", (e) => e.pk("id", "INT")),
    ]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("er/no-duplicate-entity");
  });

  test("reports duplicate attributes within an entity", () => {
    const document = compile("Invalid", [
      entity("User", (e) => e.attribute("name", "VARCHAR").attribute("name", "TEXT")),
    ]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("er/no-duplicate-attribute");
  });

  test("reports unknown entity references in relationships", () => {
    const document = compile(
      "Invalid",
      [entity("User", (e) => e.pk("id", "UUID"))],
      [
        relationship("User", "NonExistent", {
          sourceCardinality: "1",
          targetCardinality: "*",
        }),
      ]
    );

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "er/no-unknown-entity-ref", severity: "error" })
    );
  });

  test("compiles deterministically", () => {
    const { entities, relationships } = validErElements();
    const first = compile("E-Commerce ER", entities, relationships);
    const second = compile("E-Commerce ER", entities, relationships);

    expect(second).toEqual(first);
  });

  test("matches the ER diagram golden fixture", async () => {
    await expectGolden("er", await erSvg());
  });

  test("supports 1:1 cardinality", () => {
    const document = compile(
      "OneToOne",
      [
        entity("User", (e) => e.pk("id", "UUID")),
        entity("Profile", (e) => e.pk("id", "UUID").fk("userId", "UUID")),
      ],
      [
        relationship("User", "Profile", {
          sourceCardinality: "1",
          targetCardinality: "1",
          name: "has",
        }),
      ]
    );

    const edge = document.edges[0];
    expect(edge?.metadata?.sourceCardinality).toBe("1");
    expect(edge?.metadata?.targetCardinality).toBe("1");
    expect(edge?.label).toBe("has");
  });

  test("supports M:N cardinality", () => {
    const document = compile(
      "ManyToMany",
      [entity("Student", (e) => e.pk("id", "UUID")), entity("Course", (e) => e.pk("id", "UUID"))],
      [
        relationship("Student", "Course", {
          sourceCardinality: "*",
          targetCardinality: "*",
          name: "enrolls",
        }),
      ]
    );

    const edge = document.edges[0];
    expect(edge?.metadata?.sourceCardinality).toBe("*");
    expect(edge?.metadata?.targetCardinality).toBe("*");
  });

  test("handles entities with no attributes", () => {
    const document = compile("Empty", [entity("EmptyEntity")]);
    const node = document.nodes[0];

    expect(node?.label).toBe("EmptyEntity");
    const attrCompartment = node?.compartments?.find((c) => c.id === `${node.id}:attributes`);
    expect(attrCompartment).toBeUndefined();
  });

  test("handles relationships without names", () => {
    const document = compile(
      "Unnamed",
      [entity("A", (e) => e.pk("id", "UUID")), entity("B", (e) => e.pk("id", "UUID"))],
      [relationship("A", "B", { sourceCardinality: "1", targetCardinality: "*" })]
    );

    expect(document.edges[0]?.label).toBeUndefined();
  });

  test("defaults cardinality to * (many)", () => {
    const document = compile(
      "Defaults",
      [entity("A", (e) => e.pk("id", "UUID")), entity("B", (e) => e.pk("id", "UUID"))],
      [relationship("A", "B")]
    );

    const edge = document.edges[0];
    expect(edge?.metadata?.sourceCardinality).toBe("*");
    expect(edge?.metadata?.targetCardinality).toBe("*");
  });
});
