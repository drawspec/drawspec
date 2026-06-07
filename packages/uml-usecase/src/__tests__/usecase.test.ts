import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import {
  actor,
  compile,
  systemBoundary,
  useCase,
  useCaseRelationship,
  usecaseDiagram,
} from "../index";

function validUseCaseElements() {
  const userActor = actor("User");
  const adminActor = actor("Admin");
  const loginUc = useCase("Login");
  const manageUc = useCase("Manage Users", { description: "Admin manages user accounts" });
  const boundary = systemBoundary("System", ["Login", "Manage Users"]);
  const relationships = [
    useCaseRelationship("User", "Login", "associate"),
    useCaseRelationship("Admin", "Login", "associate"),
    useCaseRelationship("Admin", "Manage Users", "associate"),
  ];
  return {
    actors: [userActor, adminActor],
    useCases: [loginUc, manageUc],
    boundary,
    relationships,
  };
}

async function usecaseSvg(): Promise<string> {
  const { actors, useCases, relationships, boundary } = validUseCaseElements();
  const document = compile("Use Case Diagram", actors, useCases, relationships, [boundary]);
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

describe("@drawspec/uml-usecase", () => {
  test("compiles actors to IR nodes with correct kind", () => {
    const { actors, useCases, relationships } = validUseCaseElements();
    const document = compile("Use Case Diagram", actors, useCases, relationships);
    const userNode = document.nodes.find((n) => n.label === "User");

    expect(document.kind).toBe("use-case");
    expect(document.nodes.filter((n) => n.kind === "actor")).toHaveLength(2);
    expect(userNode?.kind).toBe("actor");
    expect(userNode?.label).toBe("User");
  });

  test("compiles use cases to IR nodes with ellipse shape", () => {
    const { actors, useCases, relationships } = validUseCaseElements();
    const document = compile("Use Case Diagram", actors, useCases, relationships);
    const loginNode = document.nodes.find((n) => n.label === "Login");

    expect(document.nodes.filter((n) => n.kind === "use-case")).toHaveLength(2);
    expect(loginNode?.shape).toEqual({ type: "ellipse" });
    expect(loginNode?.description).toBeUndefined();
  });

  test("compiles use case with description", () => {
    const { actors, useCases, relationships } = validUseCaseElements();
    const document = compile("Use Case Diagram", actors, useCases, relationships);
    const manageNode = document.nodes.find((n) => n.label === "Manage Users");

    expect(manageNode?.description).toBe("Admin manages user accounts");
  });

  test("compiles relationships with correct direction and labels", () => {
    const { actors, useCases, relationships } = validUseCaseElements();
    const document = compile("Use Case Diagram", actors, useCases, relationships);
    const includeEdge = document.edges.find((e) => e.kind === "associate");

    expect(document.edges).toHaveLength(3);
    expect(includeEdge?.direction).toBe("forward");
  });

  test("include and extend relationships produce dashed edges with labels", () => {
    const actors = [actor("User")];
    const useCases = [useCase("Login"), useCase("Authenticate")];
    const relationships = [useCaseRelationship("Login", "Authenticate", "include")];
    const document = compile("Test", actors, useCases, relationships);
    const edge = document.edges[0];

    expect(edge?.kind).toBe("include");
    expect(edge?.label).toBe("<<include>>");
    expect(edge?.metadata?.dashed).toBe(true);
  });

  test("generalize relationships use backward direction", () => {
    const actors = [actor("User"), actor("Admin")];
    const useCases = [useCase("Login")];
    const relationships = [useCaseRelationship("Admin", "User", "generalize")];
    const document = compile("Test", actors, useCases, relationships);
    const edge = document.edges[0];

    expect(edge?.kind).toBe("generalize");
    expect(edge?.direction).toBe("backward");
  });

  test("reports duplicate actor/use case names", () => {
    const document = compile("Invalid", [actor("User"), actor("User")], [useCase("Login")]);

    expect(document.diagnostics?.map((d) => d.code)).toContain("usecase/no-duplicate-name");
  });

  test("reports unknown element references in relationships", () => {
    const document = compile(
      "Invalid",
      [actor("User")],
      [useCase("Login")],
      [useCaseRelationship("User", "NonExistent", "associate")]
    );

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "usecase/no-unknown-ref", severity: "error" })
    );
  });

  test("compiles deterministically", () => {
    const { actors, useCases, relationships } = validUseCaseElements();
    const first = compile("Use Case Diagram", actors, useCases, relationships);
    const second = compile("Use Case Diagram", actors, useCases, relationships);

    expect(second).toEqual(first);
  });

  test("usecaseDiagram DSL produces valid document", () => {
    const doc = usecaseDiagram("Online Shopping", (dsl) => [
      dsl.actor("Customer"),
      dsl.useCase("Browse Products"),
      dsl.useCase("Place Order"),
      dsl.associates("Customer", "Browse Products"),
      dsl.associates("Customer", "Place Order"),
    ]);

    expect(doc.kind).toBe("use-case");
    expect(doc.nodes).toHaveLength(3);
    expect(doc.edges).toHaveLength(2);
    expect(doc.diagnostics).toEqual([]);
  });

  test("actor with stereotype has compartments", () => {
    const stereotypedActor = actor("System", { stereotype: "external" });
    const document = compile("Stereotype", [stereotypedActor], []);
    const node = document.nodes[0];

    expect(node?.compartments).toBeDefined();
    expect(node?.compartments?.[0]?.lines).toHaveLength(2);
    expect(node?.compartments?.[0]?.lines[0]?.text).toBe("<<external>>");
  });

  test("matches the use case diagram golden fixture", async () => {
    await expectGolden("usecase", await usecaseSvg());
  });
});
