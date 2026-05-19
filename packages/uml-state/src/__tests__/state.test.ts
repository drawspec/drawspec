import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { final, initial, state, stateDiagram } from "../index";

async function expectGolden(name: string, svg: string): Promise<void> {
  const path = new URL(`./golden/${name}.svg`, import.meta.url).pathname;
  if (Bun.env.UPDATE_GOLDEN === "1") {
    await Bun.write(path, svg);
  }
  expect(await Bun.file(path).text()).toBe(svg);
}

describe("state diagrams", () => {
  test("compiles states and pseudostates to state DiagramDocument IR", () => {
    const doc = stateDiagram("Kinds", () => [initial("start"), state("Created"), final("end")]);

    expect(doc).toMatchObject({
      schemaVersion: "1.0.0",
      title: "Kinds",
      kind: "state",
      groups: [],
      annotations: [],
    });
    expect(doc.nodes.map((node) => node.kind).sort()).toEqual([
      "pseudostate",
      "pseudostate",
      "state",
    ]);
    expect(doc.nodes.find((node) => node.label === "start")?.metadata).toEqual({
      pseudostate: "initial",
    });
    expect(doc.nodes.find((node) => node.label === "end")?.metadata).toEqual({
      pseudostate: "final",
    });
  });

  test("state.to creates labeled transition edges by target name", () => {
    const doc = stateDiagram("Payment Lifecycle", () => [
      state("Created", (s) => [s.to("Authorized").label("authorize")]),
      state("Authorized"),
    ]);
    const source = doc.nodes.find((node) => node.label === "Created");
    const target = doc.nodes.find((node) => node.label === "Authorized");

    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0]).toMatchObject({
      kind: "transition",
      sourceId: source?.id,
      targetId: target?.id,
      label: "authorize",
      direction: "forward",
    });
  });

  test("pseudostates can create transitions to element references", () => {
    const created = state("Created");
    const start = initial("start");
    start.to(created).label("begin");

    const doc = stateDiagram("Initial", () => [start, created]);

    expect(doc.edges[0]).toMatchObject({
      sourceId: start.id,
      targetId: created.id,
      label: "begin",
    });
  });

  test("payment lifecycle example compiles to deterministic sorted nodes and edges", () => {
    const build = () => {
      const start = initial("start");
      start.to("Created").label("begin");

      return stateDiagram("Payment Lifecycle", () => [
        start,
        state("Created", (s) => [
          s.to("Authorized").label("authorize"),
          s.to("Failed").label("decline"),
        ]),
        state("Authorized", (s) => [
          s.to("Captured").label("capture"),
          s.to("Failed").label("timeout"),
        ]),
        state("Captured"),
        state("Failed", (s) => [s.to("end").label("end")]),
        final("end"),
      ]);
    };

    const doc = build();

    expect(doc).toEqual(build());
    expect(doc.nodes.map((node) => node.id)).toEqual([...doc.nodes.map((node) => node.id)].sort());
    expect(doc.edges.map((edge) => edge.id)).toEqual([...doc.edges.map((edge) => edge.id)].sort());
    expect(doc.nodes).toHaveLength(6);
    expect(doc.edges).toHaveLength(6);
  });

  test("supports spec-style helper callback API", () => {
    const doc = stateDiagram("Payment lifecycle")(({ initial, state, final }) => {
      const start = initial();
      const created = state("Created");
      const authorized = state("Authorized");
      const captured = state("Captured");
      const failed = final("Failed");

      start.to(created);
      created.to(authorized, "authorize");
      created.to(failed, "decline");
      authorized.to(captured, "capture");

      return [start, created, authorized, captured, failed];
    });

    expect(doc.kind).toBe("state");
    expect(doc.nodes).toHaveLength(5);
    expect(doc.edges).toHaveLength(4);
  });

  test("renders a golden SVG with bare workspace package imports", async () => {
    const start = initial("start");
    start.to("Created");
    const doc = stateDiagram("Payment Lifecycle", () => [
      start,
      state("Created", (s) => [s.to("Authorized").label("authorize")]),
      state("Authorized", (s) => [s.to("Captured").label("capture")]),
      state("Captured", (s) => [s.to("end").label("finish")]),
      final("end"),
    ]);
    const positionedDiagram = await simpleGraphLayout().layout(doc, { direction: "LR" });
    const svg = await renderSvg(doc, { positionedDiagram });

    await expectGolden("state", svg);
  });

  test("emits diagnostic for dangling transition target", () => {
    const doc = stateDiagram("Dangling", () => [state("Created", (s) => [s.to("NonExistent")])]);

    expect(doc.edges).toHaveLength(0);
    expect(doc.diagnostics?.map((d) => d.code)).toEqual(["state/dangling-transition-target"]);
  });

  test("duplicate state names get unique IDs via helper callback", () => {
    const doc = stateDiagram("Dup")(({ state }) => {
      return [state("Active"), state("Active")];
    });

    const ids = doc.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(2);
    expect(doc.nodes).toHaveLength(2);
  });

  test("duplicate pseudostate names get unique IDs via helper callback", () => {
    const doc = stateDiagram("DupPseudo")(({ initial, final }) => {
      return [initial(), initial(), final(), final()];
    });

    const ids = doc.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(4);
    expect(doc.nodes).toHaveLength(4);
  });
});
