import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { action, activity, activityDiagram, decision, end, start } from "../index";

function labelsByKind(doc: ReturnType<typeof activityDiagram>) {
  return doc.nodes.map((node) => ({ kind: node.kind, label: node.label }));
}

describe("activityDiagram", () => {
  test("creates start, action, decision, and end nodes", () => {
    const doc = activityDiagram("Kinds", () => [
      start("begin"),
      action("Work"),
      decision("Done?"),
      end("done"),
    ]);

    expect(doc.kind).toBe("activity");
    expect(labelsByKind(doc)).toEqual([
      { kind: "initial", label: "begin" },
      { kind: "action", label: "Work" },
      { kind: "decision", label: "Done?" },
      { kind: "final", label: "done" },
    ]);
  });

  test("action .to() chains create deterministic flow edges", () => {
    const build = () =>
      activityDiagram("Linear", ({ start, action, end }) => {
        start("begin").to(action("Submit Order")).to(action("Authorize Payment")).to(end("done"));
      });

    const doc = build();

    expect(doc).toEqual(build());
    expect(doc.edges).toHaveLength(3);
    expect(doc.edges.map((edge) => edge.kind)).toEqual(["flow", "flow", "flow"]);
    expect(doc.edges.map((edge) => edge.direction)).toEqual(["forward", "forward", "forward"]);
  });

  test("inline action definitions support labelled .when() branches", () => {
    const doc = activityDiagram("Approval", () => [
      start("begin").to("Authorize Payment"),
      action("Authorize Payment", (a) => [
        a.to("Approved").when("authorized"),
        a.to("Rejected").when("declined"),
      ]),
      action("Approved").to(end("done")),
      action("Rejected"),
    ]);

    expect(doc.edges.map((edge) => edge.label)).toContain("authorized");
    expect(doc.edges.map((edge) => edge.label)).toContain("declined");
    expect(doc.nodes.filter((node) => node.label === "Authorize Payment")).toHaveLength(1);
  });

  test("decision .when(label).to(target) branches compile labels", () => {
    const doc = activityDiagram("Decision", () => [
      start("begin").to("Check Result"),
      decision("Check Result", (dec) => [
        dec.when("yes").to("Capture Payment"),
        dec.when("no").to("Send Rejection"),
      ]),
      action("Capture Payment"),
      action("Send Rejection"),
      end("done"),
    ]);

    const branchLabels = doc.edges
      .filter(
        (edge) => edge.sourceId === doc.nodes.find((node) => node.label === "Check Result")?.id
      )
      .map((edge) => edge.label);

    expect(branchLabels).toEqual(["yes", "no"]);
  });

  test("spec-style curried activity API compiles payment flow", () => {
    const doc = activity("Payment flow")(({ start, action, decision, end }) => {
      const submit = action("Submit payment");
      const authorize = action("Authorize payment");
      const approved = decision("Approved?");
      const capture = action("Capture payment");
      const reject = action("Reject payment");

      start().to(submit).to(authorize).to(approved);

      approved.when("yes").to(capture).to(end());
      approved.when("no").to(reject).to(end());
    });

    expect(doc).toMatchObject({ schemaVersion: "1.0.0", kind: "activity", title: "Payment flow" });
    expect(doc.nodes).toHaveLength(7);
    expect(doc.edges).toHaveLength(7);
    expect(doc.diagnostics).toEqual([]);
  });

  test("emits limited v1 validation diagnostics for unreachable actions and orphan nodes", () => {
    const doc = activityDiagram("Diagnostics", () => [action("Unreachable"), action("Orphan")]);

    expect(doc.diagnostics?.map((diagnostic) => diagnostic.code)).toEqual([
      "DS_ACTIVITY_UNREACHABLE_ACTION",
      "DS_ACTIVITY_NO_ORPHAN_NODES",
      "DS_ACTIVITY_UNREACHABLE_ACTION",
      "DS_ACTIVITY_NO_ORPHAN_NODES",
    ]);
  });

  test("renders via bare workspace layout and renderer imports", async () => {
    const doc = activityDiagram("Renderable", () => [
      start("begin").to("Do Work"),
      action("Do Work").to(end("done")),
    ]);
    const positionedDiagram = await simpleGraphLayout().layout(doc, { direction: "TB" });
    const svg = await renderSvg(doc, { positionedDiagram });

    expect(svg).toContain("Do Work");
    expect(svg).toContain("<svg");
  });
});
