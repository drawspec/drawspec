import { describe, expect, test } from "bun:test";
import { sequence } from "../index";

interface OperandMetadata {
  condition: string;
  childIds: string[];
}

function operandsOf(group: { metadata?: Record<string, unknown> }): OperandMetadata[] {
  return group.metadata?.operands as OperandMetadata[];
}

describe("sequence", () => {
  test("creates actors and participants with correct kinds", () => {
    const doc = sequence("Kinds", (s) => {
      s.actor("User");
      s.participant("API");
    });

    expect(doc.kind).toBe("sequence");
    expect(doc.nodes.map((node) => ({ kind: node.kind, label: node.label }))).toEqual([
      { kind: "actor", label: "User" },
      { kind: "participant", label: "API" },
    ]);
  });

  test("participant.to creates an edge with source, target, label, and direction", () => {
    const doc = sequence("Message", (s) => {
      const api = s.participant("API");
      const bank = s.participant("Bank");

      api.to(bank, "Authorize");
    });

    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0]).toMatchObject({
      kind: "message",
      sourceId: doc.nodes[0]?.id,
      targetId: doc.nodes[1]?.id,
      label: "Authorize",
      direction: "forward",
    });
  });

  test("payment authorization example compiles to valid IR", () => {
    const doc = sequence("Payment authorization", (s) => {
      const user = s.actor("User");
      const web = s.participant("Web App");
      const api = s.participant("API");
      const bank = s.participant("Bank");

      user.to(web, "Enter payment details");
      web.to(api, "Submit payment");
      api.to(bank, "Authorize");
      bank.to(api, "Approval");
      api.to(web, "Confirmation");
      web.to(user, "Show receipt");
    });

    expect(doc.schemaVersion).toBe("1.0.0");
    expect(doc.kind).toBe("sequence");
    expect(doc.nodes).toHaveLength(4);
    expect(doc.edges).toHaveLength(6);
    expect(doc.groups).toHaveLength(0);
  });

  test("alt and else create one group with operand child structure", () => {
    const doc = sequence("Payment with alt/else", (s) => {
      const user = s.actor("User");
      const api = s.participant("API");
      const bank = s.participant("Bank");

      user.to(api, "Submit payment");
      api.to(bank, "Authorize");
      s.alt("Approved", () => {
        bank.to(api, "Approval");
        api.to(user, "Show receipt");
      }).else("Declined", () => {
        bank.to(api, "Decline");
        api.to(user, "Show error");
      });
    });

    expect(doc.groups).toHaveLength(1);
    expect(doc.groups[0]?.kind).toBe("alt");
    expect(doc.groups[0]?.childIds).toEqual(doc.edges.slice(2).map((edge) => edge.id));
    expect(operandsOf(doc.groups[0] ?? { metadata: {} })).toEqual([
      { condition: "Approved", childIds: doc.edges.slice(2, 4).map((edge) => edge.id) },
      { condition: "Declined", childIds: doc.edges.slice(4, 6).map((edge) => edge.id) },
    ]);
  });

  test("notes attach to participants and messages", () => {
    const doc = sequence("Notes", (s) => {
      const user = s.actor("User").note("Primary customer");
      const api = s.participant("API");

      user.to(api, "Request").note("Synchronous request");
    });

    expect(doc.annotations).toEqual([
      expect.objectContaining({
        kind: "note",
        label: "Primary customer",
        targetId: doc.nodes[0]?.id,
      }),
      expect.objectContaining({
        kind: "note",
        label: "Synchronous request",
        targetId: doc.edges[0]?.id,
      }),
    ]);
  });

  test("produces deterministic IDs across runs", () => {
    const build = () =>
      sequence("Stable", (s) => {
        const user = s.actor("User");
        const api = s.participant("API");

        user.to(api, "Call").note("tracked");
      });

    expect(build()).toEqual(build());
  });

  test("empty sequence produces a valid empty DiagramDocument", () => {
    const doc = sequence("Empty");

    expect(doc).toMatchObject({
      schemaVersion: "1.0.0",
      title: "Empty",
      kind: "sequence",
      nodes: [],
      edges: [],
      groups: [],
      annotations: [],
    });
  });

  test("nested fragments preserve nested group and message children", () => {
    const doc = sequence("Nested", (s) => {
      const user = s.actor("User");
      const api = s.participant("API");
      const bank = s.participant("Bank");

      s.alt("Has card", () => {
        user.to(api, "Submit card");
        s.alt("Approved", () => {
          bank.to(api, "Approval");
        }).else("Declined", () => {
          bank.to(api, "Decline");
        });
      }).else("Missing card", () => {
        api.to(user, "Ask for card");
      });
    });

    expect(doc.groups).toHaveLength(2);
    const nested = doc.groups[0];
    const outer = doc.groups[1];

    expect(nested?.childIds).toEqual(doc.edges.slice(1, 3).map((edge) => edge.id));
    expect(outer?.childIds).toEqual([
      doc.edges[0]?.id,
      doc.edges[1]?.id,
      doc.edges[2]?.id,
      nested?.id,
      doc.edges[3]?.id,
    ]);
    expect(operandsOf(outer ?? { metadata: {} })[0]?.condition).toBe("Has card");
    expect(operandsOf(outer ?? { metadata: {} })[1]?.condition).toBe("Missing card");
  });
});
