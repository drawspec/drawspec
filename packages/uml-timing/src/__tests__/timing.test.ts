import { describe, expect, test } from "bun:test";
import { simpleGraphLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
import { compile, message, participant, state, timingDiagram, transition } from "../index";

function validTimingElements() {
  const alice = participant("Alice");
  const bob = participant("Bob", { type: "actor" });
  const idle = state("Idle");
  const active = state("Active", { color: "#22c55e" });
  const waiting = state("Waiting");
  const transitions = [
    transition("Alice", "Idle", "Active", { atTime: 0 }),
    transition("Bob", "Idle", "Waiting", { atTime: 1, message: "request" }),
    transition("Bob", "Waiting", "Active", { atTime: 2 }),
  ];
  const messages = [message("Alice", "Bob", 1, { label: "signal" })];
  return { participants: [alice, bob], states: [idle, active, waiting], transitions, messages };
}

async function timingSvg(): Promise<string> {
  const { participants, states, transitions, messages } = validTimingElements();
  const document = compile("Timing Diagram", participants, states, transitions, messages);
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

describe("@drawspec/uml-timing", () => {
  test("compiles participants to IR nodes", () => {
    const { participants, states, transitions, messages } = validTimingElements();
    const document = compile("Timing", participants, states, transitions, messages);
    const participantNodes = document.nodes.filter((n) => n.kind === "timing-participant");

    expect(document.kind).toBe("timing");
    expect(participantNodes).toHaveLength(2);
    const labels = participantNodes.map((n) => n.label).sort();
    expect(labels).toEqual(["Alice", "Bob"]);
  });

  test("compiles states to IR nodes with rounded-rect shape", () => {
    const { participants, states, transitions, messages } = validTimingElements();
    const document = compile("Timing", participants, states, transitions, messages);
    const stateNodes = document.nodes.filter((n) => n.kind === "timing-state");

    expect(stateNodes).toHaveLength(3);
    expect(stateNodes[0]?.shape).toEqual({ type: "rounded-rect", radius: 8 });
  });

  test("compiles state with color in metadata", () => {
    const { participants, states, transitions, messages } = validTimingElements();
    const document = compile("Timing", participants, states, transitions, messages);
    const activeState = document.nodes.find((n) => n.label === "Active");

    expect(activeState?.metadata?.color).toBe("#22c55e");
  });

  test("compiles transitions to IR edges with forward direction", () => {
    const { participants, states, transitions, messages } = validTimingElements();
    const document = compile("Timing", participants, states, transitions, messages);
    const transitionEdges = document.edges.filter((e) => e.kind === "timing-transition");

    expect(transitionEdges).toHaveLength(3);
    expect(transitionEdges[0]?.direction).toBe("forward");
  });

  test("transition edge includes participant and time metadata", () => {
    const { participants, states, transitions, messages } = validTimingElements();
    const document = compile("Timing", participants, states, transitions, messages);
    const transEdge = document.edges.find(
      (e) => e.kind === "timing-transition" && e.label === "request"
    );

    expect(transEdge?.metadata?.atTime).toBe(1);
  });

  test("compiles messages to IR edges with timing-message kind", () => {
    const { participants, states, transitions, messages } = validTimingElements();
    const document = compile("Timing", participants, states, transitions, messages);
    const msgEdges = document.edges.filter((e) => e.kind === "timing-message");

    expect(msgEdges).toHaveLength(1);
    expect(msgEdges[0]?.label).toBe("signal");
    expect(msgEdges[0]?.metadata?.atTime).toBe(1);
  });

  test("reports duplicate participant names", () => {
    const document = compile(
      "Invalid",
      [participant("Alice"), participant("Alice")],
      [state("Idle")]
    );

    expect(document.diagnostics?.map((d) => d.code)).toContain("timing/no-duplicate-name");
  });

  test("reports unknown participant references in transitions", () => {
    const document = compile(
      "Invalid",
      [participant("Alice")],
      [state("Idle"), state("Active")],
      [transition("NonExistent", "Idle", "Active", { atTime: 0 })]
    );

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "timing/no-unknown-ref", severity: "error" })
    );
  });

  test("reports unknown state references in transitions", () => {
    const document = compile(
      "Invalid",
      [participant("Alice")],
      [state("Idle")],
      [transition("Alice", "Idle", "NonExistent", { atTime: 0 })]
    );

    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "timing/no-unknown-ref", severity: "error" })
    );
  });

  test("compiles deterministically", () => {
    const { participants, states, transitions, messages } = validTimingElements();
    const first = compile("Timing", participants, states, transitions, messages);
    const second = compile("Timing", participants, states, transitions, messages);

    expect(second).toEqual(first);
  });

  test("timingDiagram DSL produces valid document", () => {
    const doc = timingDiagram("Signal", (dsl) => [
      dsl.participant("Alice"),
      dsl.participant("Bob"),
      dsl.state("Idle"),
      dsl.state("Active"),
      dsl.transition("Alice", "Idle", "Active", { atTime: 0 }),
      dsl.message("Alice", "Bob", 1, { label: "ping" }),
    ]);

    expect(doc.kind).toBe("timing");
    expect(doc.nodes).toHaveLength(4); // 2 participants + 2 states
    expect(doc.edges).toHaveLength(2); // 1 transition + 1 message
    expect(doc.diagnostics).toEqual([]);
  });

  test("matches the timing diagram golden fixture", async () => {
    await expectGolden("timing", await timingSvg());
  });
});
