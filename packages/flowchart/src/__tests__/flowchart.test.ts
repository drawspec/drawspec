import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { flowchart, flowchartDiagram } from "../index";

async function expectGolden(name: string, svg: string): Promise<void> {
  const path = new URL(`./golden/${name}.svg`, import.meta.url).pathname;
  if (Bun.env.UPDATE_GOLDEN === "1") {
    await Bun.write(path, svg);
  }
  expect(await Bun.file(path).text()).toBe(svg);
}

describe("@drawspec/flowchart", () => {
  test("creates all node kinds with correct shapes", () => {
    const doc = flowchartDiagram("Kinds", ({ terminal, process_, decision, io, connector }) => [
      terminal("Start"),
      process_("Do Work"),
      decision("Done?"),
      io("Read Input"),
      connector("A"),
      terminal("End"),
    ]);

    expect(doc.kind).toBe("graph");
    expect(doc.nodes).toHaveLength(6);
    expect(doc.nodes.find((n) => n.label === "Start")?.shape).toEqual({
      type: "rounded-rect",
      radius: 20,
    });
    expect(doc.nodes.find((n) => n.label === "Do Work")?.shape).toEqual({
      type: "rounded-rect",
      radius: 8,
    });
    expect(doc.nodes.find((n) => n.label === "Done?")?.shape).toEqual({
      type: "diamond",
    });
    expect(doc.nodes.find((n) => n.label === "Read Input")?.shape).toEqual({
      type: "parallelogram",
    });
    expect(doc.nodes.find((n) => n.label === "A")?.shape).toEqual({
      type: "circle",
    });
  });

  test("process .to() chains create deterministic flow edges", () => {
    const build = () =>
      flowchartDiagram("Linear", ({ terminal, process_ }) => {
        const start = terminal("Start");
        const step1 = process_("Step 1");
        const step2 = process_("Step 2");
        const end = terminal("End");
        start.to(step1).to(step2).to(end);
      });

    const doc = build();

    expect(doc).toEqual(build());
    expect(doc.edges).toHaveLength(3);
    expect(doc.edges.every((edge) => edge.kind === "flow")).toBe(true);
    expect(doc.edges.every((edge) => edge.direction === "forward")).toBe(true);
  });

  test("decision .to().when() labels branches", () => {
    const doc = flowchartDiagram("Decision", ({ terminal, process_, decision }) => {
      const start = terminal("Start");
      const check = decision("Valid?");
      const yes = process_("Proceed");
      const no = process_("Reject");
      const end = terminal("End");

      start.to(check);
      check.to(yes).when("yes");
      check.to(no).when("no");
      yes.to(end);
      no.to(end);
    });

    const checkId = doc.nodes.find((n) => n.label === "Valid?")?.id;
    const branchLabels = doc.edges
      .filter((edge) => edge.sourceId === checkId)
      .map((edge) => edge.label)
      .sort();

    expect(branchLabels).toEqual(["no", "yes"]);
  });

  test("curried flowchart API compiles payment processing flow", () => {
    const doc = flowchart("Payment Processing")(({ terminal, process_, decision }) => {
      const start = terminal("Start");
      const submit = process_("Submit Order");
      const validate = decision("Valid?");
      const charge = process_("Charge Card");
      const decline = process_("Decline");
      const end = terminal("End");

      start.to(submit).to(validate);
      validate.to(charge).when("yes").to(end);
      validate.to(decline).when("no").to(end);
    });

    expect(doc).toMatchObject({
      schemaVersion: "1.0.0",
      kind: "graph",
      title: "Payment Processing",
    });
    expect(doc.nodes).toHaveLength(6);
    expect(doc.edges).toHaveLength(6);
    expect(doc.diagnostics).toEqual([]);
  });

  test("io and connector nodes render correctly", () => {
    const doc = flowchartDiagram("IO", ({ terminal, io, process_, connector }) => {
      const start = terminal("Start");
      const input = io("Read Data");
      const compute = process_("Process");
      const jump = connector("A");
      const end = terminal("End");

      start.to(input).to(compute).to(jump).to(end);
    });

    expect(doc.nodes.map((n) => n.kind)).toContain("io");
    expect(doc.nodes.map((n) => n.kind)).toContain("connector");
    expect(doc.edges).toHaveLength(4);
  });

  test("subgraph collects child node ids", () => {
    const doc = flowchartDiagram("Subgraph", ({ terminal, subgraph }) => {
      const start = terminal("Start");
      const group = subgraph("Group", ({ process_ }) => [process_("Step A"), process_("Step B")]);
      const end = terminal("End");

      start.to(group).to(end);
    });

    const subgraphNode = doc.nodes.find((n) => n.kind === "subgraph");
    expect(subgraphNode?.metadata?.childIds).toHaveLength(2);
  });

  test("emits diagnostics for orphan nodes", () => {
    const doc = flowchartDiagram("Orphans", ({ process_ }) => [process_("Alone")]);

    expect(doc.diagnostics?.map((d) => d.code)).toContain("flowchart/orphan-node");
  });

  test("emits diagnostics for decision nodes with fewer than 2 branches", () => {
    const doc = flowchartDiagram("Few Branches", ({ terminal, process_, decision }) => {
      const start = terminal("Start");
      const check = decision("Check?");
      const yes = process_("Yes");
      start.to(check);
      check.to(yes);
    });

    expect(doc.diagnostics?.map((d) => d.code)).toContain("flowchart/decision-needs-branches");
  });

  test("renders a golden SVG via layout and renderer", async () => {
    const doc = flowchartDiagram("Renderable", ({ terminal, process_, decision }) => {
      const start = terminal("Start");
      const work = process_("Do Work");
      const done = decision("Done?");
      const finish = terminal("End");
      const retry = process_("Retry");

      start.to(work).to(done);
      done.to(finish).when("yes");
      done.to(retry).when("no");
      retry.to(work);
    });

    const positionedDiagram = await simpleGraphLayout().layout(doc, { direction: "TB" });
    const svg = await renderSvg(doc, { positionedDiagram });

    expect(svg).toContain("Do Work");
    expect(svg).toContain("<svg");

    await expectGolden("flowchart", svg);
  });
});
