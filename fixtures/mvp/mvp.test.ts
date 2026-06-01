import { describe, test } from "bun:test";
import type { Workspace } from "../../packages/architecture/src";
import {
  compileDiagram,
  compileWorkspace,
  expectDiagram,
  expectGoldenIr,
  expectGoldenSvg,
  expectValid,
  expectViolation,
} from "../../packages/testkit/src";
import { recommendedRules, validate } from "../../packages/validation/src";
import invalidSequence from "../edge-cases/invalid-empty-title.sequence";
import invalidWorkspace from "../edge-cases/invalid-missing-technology.arch";
import activityFlow from "./activity-flow.activity";
import nestedWorkspace from "./architecture-nested.arch";
import paymentsWorkspace from "./architecture-payments.arch";
import classDomain from "./class-domain.class";
import componentSystem from "./component-system.component";
import deploymentCloud from "./deployment-cloud.deployment";
import sequenceAlt from "./sequence-alt.sequence";
import sequenceBasic from "./sequence-basic.sequence";
import stateLifecycle from "./state-lifecycle.state";

const goldenDir = "fixtures/mvp/__golden__";

const validFixtures = [
  { name: "sequence-basic", input: sequenceBasic, node: "User", edge: "Authorize payment" },
  {
    name: "sequence-alt",
    input: sequenceAlt,
    node: "Payments",
    edge: "Decline reason",
    group: "alt",
  },
  {
    name: "architecture-payments",
    input: paymentsWorkspace,
    node: "Payments API",
    edge: "Requests payment",
    group: "Shop",
  },
  {
    name: "architecture-nested",
    input: nestedWorkspace,
    node: "Admin API",
    edge: "Persists settings",
    group: "Commerce",
  },
  {
    name: "class-domain",
    input: classDomain,
    node: "AuthService",
    edgeKind: "implements",
  },
  {
    name: "state-lifecycle",
    input: stateLifecycle,
    node: "Delivered",
    edge: "deliver [signature captured]",
  },
  {
    name: "component-system",
    input: componentSystem,
    node: "Order Service",
    edge: "Authorize payment",
  },
  {
    name: "deployment-cloud",
    input: deploymentCloud,
    node: "App Cluster",
    edge: "HTTPS",
    group: "App Cluster",
  },
  {
    name: "activity-flow",
    input: activityFlow,
    node: "Ship order",
    edge: "Yes",
  },
] as const;

describe("MVP fixture suite", () => {
  for (const fixture of validFixtures) {
    test(`${fixture.name} validates and matches golden snapshots`, async () => {
      const document = await compileDiagram(fixture.input);

      expectValid(validate({ diagram: document, rules: recommendedRules }));
      const assertion = expectDiagram(document).toHaveNode(fixture.node);
      if ("edge" in fixture) {
        assertion.toHaveEdge(fixture.edge);
      }
      if ("edgeKind" in fixture) {
        const hasEdgeKind = document.edges.some((edge) => edge.kind === fixture.edgeKind);
        if (!hasEdgeKind) {
          throw new Error(
            `Expected diagram '${document.id}' to contain edge kind '${fixture.edgeKind}'.`
          );
        }
      }
      if ("group" in fixture) {
        assertion.toHaveGroup(fixture.group);
      }
      await expectGoldenIr(`${goldenDir}/${fixture.name}.ir.snapshot`, document);
      await expectGoldenSvg(`${goldenDir}/${fixture.name}.svg`, document);
    });
  }

  test("compileWorkspace loads architecture workspace modules", async () => {
    const documents = await compileWorkspace({ default: paymentsWorkspace });
    const document = documents[0];
    if (document === undefined) {
      throw new Error("Expected payments workspace to compile to one diagram.");
    }
    expectDiagram(document).toHaveNode("Ledger").toHaveEdge("Stores authorization");
  });

  test("invalid architecture fixture reports missing technology", () => {
    const workspace = invalidWorkspace as Workspace;
    expectViolation(
      validate({ model: workspace.model, rules: recommendedRules }),
      "architecture/require-technology"
    );
  });

  test("invalid sequence fixture reports an empty title", () => {
    expectViolation(
      validate({ diagram: invalidSequence, rules: recommendedRules }),
      "diagram/require-title"
    );
  });
});
