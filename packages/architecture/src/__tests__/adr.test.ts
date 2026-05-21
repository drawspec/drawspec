import { describe, expect, test } from "bun:test";
import type { ArchitectureDecisionRecord, Workspace } from "../index";
import {
  container,
  createAdr,
  exportAdrJson,
  generateAdrReport,
  getAdrStatus,
  getElementAdrs,
  linkAdrToElement,
  softwareSystem,
  workspace,
} from "../index";

function withDecisions(
  model: Workspace,
  decisions: readonly ArchitectureDecisionRecord[]
): Workspace {
  return Object.assign(model, { decisions });
}

describe("architecture decision records", () => {
  test("creates ADRs with explicit and generated dates", () => {
    const explicit = createAdr({
      id: "ADR-001",
      title: "Use PostgreSQL",
      date: "2026-05-21",
      status: "accepted",
      context: "Persistent relational storage is required.",
      decision: "Use PostgreSQL for ledger data.",
      consequences: "Teams operate PostgreSQL backups.",
      elementIds: ["ledger"],
      relatedAdrs: ["ADR-000"],
    });

    const generated = createAdr({
      id: "ADR-002",
      title: "Use queues",
      status: "proposed",
      context: "Async work is increasing.",
      decision: "Evaluate queue technology.",
      consequences: "Adds operational surface area.",
      elementIds: [],
    });

    expect(explicit.date).toBe("2026-05-21");
    expect(explicit.relatedAdrs).toEqual(["ADR-000"]);
    expect(generated.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("links ADRs to elements without duplicating element IDs", () => {
    const adr = createAdr({
      id: "ADR-003",
      title: "Use service API",
      date: "2026-05-21",
      status: "accepted",
      context: "Clients need a stable integration boundary.",
      decision: "Expose an HTTPS API.",
      consequences: "API versioning is required.",
      elementIds: ["api"],
    });

    const linked = linkAdrToElement(adr, "web");
    const unchanged = linkAdrToElement(linked, "web");

    expect(linked.elementIds).toEqual(["api", "web"]);
    expect(unchanged.elementIds).toEqual(["api", "web"]);
  });

  test("retrieves ADRs linked to a nested element", () => {
    let apiId = "";
    const base = workspace("ADR Model", (w) => {
      const system = w.model.add(softwareSystem("Payments"));
      const api = system.add(container("API"));
      apiId = api.id;
    });

    const adr = createAdr({
      id: "ADR-004",
      title: "API boundary",
      date: "2026-05-21",
      status: "accepted",
      context: "Payment consumers need a stable API.",
      decision: "Route payment traffic through the API container.",
      consequences: "The API becomes a scaling boundary.",
      elementIds: [apiId],
    });
    const unrelated = createAdr({
      id: "ADR-005",
      title: "Unrelated",
      date: "2026-05-21",
      status: "proposed",
      context: "Other context.",
      decision: "Other decision.",
      consequences: "Other consequence.",
      elementIds: ["other"],
    });

    const model = withDecisions(base, [unrelated, adr]);

    expect(getElementAdrs(model, apiId).map((item) => item.id)).toEqual(["ADR-004"]);
  });

  test("returns ADR status metadata by ID", () => {
    const adr = createAdr({
      id: "ADR-006",
      title: "Deprecate old gateway",
      date: "2026-05-21",
      status: "deprecated",
      context: "The old gateway is no longer maintained.",
      decision: "Deprecate it in favor of the API gateway.",
      consequences: "Consumers must migrate.",
      elementIds: ["gateway"],
      supersededBy: "ADR-007",
    });

    const model = withDecisions(
      workspace("Statuses", () => {}),
      [adr]
    );

    expect(getAdrStatus(model, "ADR-006")?.status).toBe("deprecated");
    expect(getAdrStatus(model, "missing")).toBeUndefined();
  });

  test("generates markdown reports grouped by status", () => {
    const accepted = createAdr({
      id: "ADR-008",
      title: "Use C4",
      date: "2026-05-21",
      status: "accepted",
      context: "Architecture needs shared vocabulary.",
      decision: "Model diagrams using C4 elements.",
      consequences: "Teams align on C4 terminology.",
      elementIds: ["workspace"],
    });
    const superseded = createAdr({
      id: "ADR-009",
      title: "Use older model",
      date: "2026-05-20",
      status: "superseded",
      context: "The original model predates C4.",
      decision: "Retire the older model.",
      consequences: "Historical documents refer to ADR-008.",
      elementIds: [],
      relatedAdrs: ["ADR-008"],
      supersededBy: "ADR-008",
    });

    const report = generateAdrReport(
      withDecisions(
        workspace("Report", () => {}),
        [superseded, accepted]
      )
    );

    expect(report).toContain("# Architecture Decision Records");
    expect(report).toContain("## accepted");
    expect(report).toContain("### ADR-008: Use C4");
    expect(report).toContain("## superseded");
    expect(report).toContain("- Related ADRs: ADR-008");
    expect(report).toContain("- Superseded by: ADR-008");
  });

  test("exports ADRs as deterministic JSON", () => {
    const first = createAdr({
      id: "ADR-011",
      title: "Second by id",
      date: "2026-05-21",
      status: "proposed",
      context: "Context.",
      decision: "Decision.",
      consequences: "Consequences.",
      elementIds: [],
    });
    const second = createAdr({
      id: "ADR-010",
      title: "First by id",
      date: "2026-05-21",
      status: "accepted",
      context: "Context.",
      decision: "Decision.",
      consequences: "Consequences.",
      elementIds: ["element"],
    });

    const json = exportAdrJson(
      withDecisions(
        workspace("JSON", () => {}),
        [first, second]
      )
    );

    expect(JSON.parse(json)).toEqual([second, first]);
  });
});
