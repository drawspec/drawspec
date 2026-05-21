import { describe, expect, test } from "bun:test";
import {
  container,
  database,
  exportToStructurizr,
  person,
  softwareSystem,
  workspace,
} from "../index";
import type { StructurizrWorkspace } from "../structurizr-exporter";
import { createPaymentsWorkspace } from "./fixtures";

function getPeople(result: StructurizrWorkspace) {
  return result.model.people ?? [];
}
function getSystems(result: StructurizrWorkspace) {
  return result.model.softwareSystems ?? [];
}

describe("exportToStructurizr", () => {
  test("maps person to Structurizr Person element", () => {
    const ws = workspace("Test", (w) => {
      w.model.add(person("Alice", { description: "A user" }));
    });
    const result = exportToStructurizr(ws);

    const people = getPeople(result);
    expect(people).toHaveLength(1);
    const alice = people[0];
    expect(alice?.type).toBe("Person");
    expect(alice?.name).toBe("Alice");
    expect(alice?.description).toBe("A user");
  });

  test("maps softwareSystem to Structurizr SoftwareSystem with containers", () => {
    const ws = workspace("Test", (w) => {
      const sys = w.model.add(softwareSystem("Platform", { description: "Main system" }));
      sys.add(container("Web App", { technology: "TypeScript" }));
    });
    const result = exportToStructurizr(ws);

    const systems = getSystems(result);
    expect(systems).toHaveLength(1);
    const sys = systems[0];
    expect(sys?.type).toBe("SoftwareSystem");
    expect(sys?.name).toBe("Platform");
    expect(sys?.description).toBe("Main system");
    const containers = sys?.containers ?? [];
    expect(containers).toHaveLength(1);
    expect(containers[0]?.type).toBe("Container");
    expect(containers[0]?.name).toBe("Web App");
    expect(containers[0]?.technology).toBe("TypeScript");
    expect(containers[0]?.parentId).toBe(sys?.id);
  });

  test("maps database to Structurizr Container with Database tag", () => {
    const ws = workspace("Test", (w) => {
      const sys = w.model.add(softwareSystem("Platform"));
      sys.add(database("Ledger", { technology: "PostgreSQL" }));
    });
    const result = exportToStructurizr(ws);

    const containers = getSystems(result)[0]?.containers ?? [];
    const db = containers[0];
    expect(db?.type).toBe("Container");
    expect(db?.name).toBe("Ledger");
    expect(db?.technology).toBe("PostgreSQL");
    expect(db?.tags).toContain("Database");
  });

  test("maps relationships between elements", () => {
    const ws = workspace("Test", (w) => {
      const user = w.model.add(person("User"));
      const app = w.model.add(softwareSystem("App"));
      user.uses(app, "Uses", { technology: "HTTPS" });
    });
    const result = exportToStructurizr(ws);

    const alice = getPeople(result)[0];
    expect(alice?.relationships).toHaveLength(1);
    const rel = alice?.relationships?.[0];
    expect(rel?.sourceId).toBe(alice?.id);
    expect(rel?.destinationId).toBe(getSystems(result)[0]?.id);
    expect(rel?.description).toBe("Uses");
    expect(rel?.technology).toBe("HTTPS");
  });

  test("maps relationships to child containers within a software system", () => {
    const ws = workspace("Test", (w) => {
      const user = w.model.add(person("User"));
      const sys = w.model.add(softwareSystem("Platform"));
      const web = sys.add(container("Web"));
      user.uses(web, "Accesses", { technology: "HTTPS" });
    });
    const result = exportToStructurizr(ws);

    const sys = getSystems(result)[0];
    expect(sys?.relationships).toHaveLength(1);
    expect(sys?.relationships?.[0]?.description).toBe("Accesses");
  });

  test("maps views with autoLayout", () => {
    const ws = workspace("Test", (w) => {
      const sys = w.model.add(softwareSystem("Platform"));
      w.views.systemContext(sys, "ctx", (v) => {
        v.autoLayout("left-right");
      });
      w.views.container(sys, "containers", (v) => {
        v.autoLayout("top-down");
      });
    });
    const result = exportToStructurizr(ws);

    expect(result.views.systemContextViews).toHaveLength(1);
    expect(result.views.systemContextViews?.[0]?.key).toBe("ctx");
    expect(result.views.systemContextViews?.[0]?.autoLayout?.rankDirection).toBe("LeftRight");

    expect(result.views.containerViews).toHaveLength(1);
    expect(result.views.containerViews?.[0]?.key).toBe("containers");
    expect(result.views.containerViews?.[0]?.autoLayout?.rankDirection).toBe("TopBottom");
  });

  test("preserves element tags excluding kind tag", () => {
    const ws = workspace("Test", (w) => {
      w.model.add(person("Alice", { tags: ["external", "vip"] }));
    });
    const result = exportToStructurizr(ws);

    expect(getPeople(result)[0]?.tags).toBe("external,vip");
  });

  test("preserves relationship tags excluding auto-tags", () => {
    const ws = workspace("Test", (w) => {
      const user = w.model.add(person("User"));
      const app = w.model.add(softwareSystem("App"));
      user.uses(app, "Calls", { tags: ["sync", "critical"] });
    });
    const result = exportToStructurizr(ws);

    const rel = getPeople(result)[0]?.relationships?.[0];
    expect(rel?.tags).toBe("critical,sync");
  });

  test("output is deterministic across runs", () => {
    const first = exportToStructurizr(createPaymentsWorkspace());
    const second = exportToStructurizr(createPaymentsWorkspace());
    expect(first).toEqual(second);
  });

  test("workspace name is preserved", () => {
    const ws = workspace("My Workspace", (w) => {
      w.model.add(person("User"));
    });
    const result = exportToStructurizr(ws);
    expect(result.name).toBe("My Workspace");
  });

  test("produces valid JSON when serialized", () => {
    const result = exportToStructurizr(createPaymentsWorkspace());
    const json = JSON.stringify(result);
    const parsed: StructurizrWorkspace = JSON.parse(json);
    expect(parsed.name).toBe("Payments");
    expect(parsed.model.people?.length).toBeGreaterThan(0);
    expect(parsed.model.softwareSystems?.length).toBeGreaterThan(0);
  });

  test("empty workspace produces minimal output", () => {
    const ws = workspace("Empty", () => {});
    const result = exportToStructurizr(ws);
    expect(result.model.people).toBeUndefined();
    expect(result.model.softwareSystems).toBeUndefined();
    expect(result.views.systemContextViews).toBeUndefined();
    expect(result.views.containerViews).toBeUndefined();
  });

  test("elements and relationships are sorted by ID", () => {
    const result = exportToStructurizr(createPaymentsWorkspace());

    const sys = getSystems(result)[0];
    const containerIds = (sys?.containers ?? []).map((c) => c.id);
    const sortedContainerIds = [...containerIds].sort();
    expect(containerIds).toEqual(sortedContainerIds);

    const rels = sys?.relationships;
    if (rels && rels.length > 1) {
      const relIds = rels.map((r) => r.id);
      const sortedRelIds = [...relIds].sort();
      expect(relIds).toEqual(sortedRelIds);
    }
  });
});
