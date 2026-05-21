import { describe, expect, test } from "bun:test";
import { container, database, exportToLikeC4, person, softwareSystem, workspace } from "../index";
import type { LikeC4Model } from "../likec4-exporter";
import { createPaymentsWorkspace } from "./fixtures";

describe("exportToLikeC4", () => {
  test("maps person to LikeC4 actor element", () => {
    const ws = workspace("Test", (w) => {
      w.model.add(person("Alice", { description: "A user" }));
    });
    const result = exportToLikeC4(ws);

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]?.kind).toBe("actor");
    expect(result.elements[0]?.name).toBe("Alice");
    expect(result.elements[0]?.description).toBe("A user");
  });

  test("maps softwareSystem to LikeC4 system element", () => {
    const ws = workspace("Test", (w) => {
      w.model.add(softwareSystem("Platform", { description: "Main system" }));
    });
    const result = exportToLikeC4(ws);

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]?.kind).toBe("system");
    expect(result.elements[0]?.name).toBe("Platform");
    expect(result.elements[0]?.description).toBe("Main system");
  });

  test("maps container to LikeC4 container element", () => {
    const ws = workspace("Test", (w) => {
      const sys = w.model.add(softwareSystem("Platform"));
      sys.add(container("Web App", { technology: "TypeScript" }));
    });
    const result = exportToLikeC4(ws);

    const containerEl = result.elements.find((e) => e.kind === "container");
    expect(containerEl).toBeDefined();
    expect(containerEl?.name).toBe("Web App");
    expect(containerEl?.technology).toBe("TypeScript");
    expect(containerEl?.parent).toBeDefined();
  });

  test("maps database to LikeC4 database element", () => {
    const ws = workspace("Test", (w) => {
      const sys = w.model.add(softwareSystem("Platform"));
      sys.add(database("Ledger", { technology: "PostgreSQL" }));
    });
    const result = exportToLikeC4(ws);

    const db = result.elements.find((e) => e.kind === "database");
    expect(db).toBeDefined();
    expect(db?.name).toBe("Ledger");
    expect(db?.technology).toBe("PostgreSQL");
  });

  test("maps relationships between elements", () => {
    const ws = workspace("Test", (w) => {
      const user = w.model.add(person("User"));
      const app = w.model.add(softwareSystem("App"));
      user.uses(app, "Uses", { technology: "HTTPS" });
    });
    const result = exportToLikeC4(ws);

    expect(result.relations).toHaveLength(1);
    const rel = result.relations[0];
    expect(rel?.title).toBe("Uses");
    expect(rel?.technology).toBe("HTTPS");
    expect(rel?.source).toBeTruthy();
    expect(rel?.target).toBeTruthy();
  });

  test("preserves element tags excluding kind tag", () => {
    const ws = workspace("Test", (w) => {
      w.model.add(person("Alice", { tags: ["external", "vip"] }));
    });
    const result = exportToLikeC4(ws);

    expect(result.elements[0]?.tags).toEqual(["external", "vip"]);
  });

  test("preserves relationship tags excluding auto-tags", () => {
    const ws = workspace("Test", (w) => {
      const user = w.model.add(person("User"));
      const app = w.model.add(softwareSystem("App"));
      user.uses(app, "Calls", { tags: ["sync", "critical"] });
    });
    const result = exportToLikeC4(ws);

    expect(result.relations[0]?.tags).toEqual(["critical", "sync"]);
  });

  test("maps views with subject and autoLayout", () => {
    const ws = workspace("Test", (w) => {
      const sys = w.model.add(softwareSystem("Platform"));
      w.views.systemContext(sys, "ctx", (v) => {
        v.autoLayout("left-right");
      });
    });
    const result = exportToLikeC4(ws);

    expect(result.views).toHaveLength(1);
    expect(result.views[0]?.viewOf).toBeDefined();
    expect(result.views[0]?.autoLayout?.direction).toBe("LeftRight");
  });

  test("output is deterministic across runs", () => {
    const first = exportToLikeC4(createPaymentsWorkspace());
    const second = exportToLikeC4(createPaymentsWorkspace());
    expect(first).toEqual(second);
  });

  test("produces valid JSON when serialized", () => {
    const result = exportToLikeC4(createPaymentsWorkspace());
    const json = JSON.stringify(result);
    const parsed: LikeC4Model = JSON.parse(json);
    expect(parsed.elements.length).toBeGreaterThan(0);
    expect(parsed.relations.length).toBeGreaterThan(0);
  });

  test("empty workspace produces empty arrays", () => {
    const ws = workspace("Empty", () => {});
    const result = exportToLikeC4(ws);
    expect(result.elements).toEqual([]);
    expect(result.relations).toEqual([]);
    expect(result.views).toEqual([]);
  });

  test("elements and relations are sorted by ID", () => {
    const result = exportToLikeC4(createPaymentsWorkspace());

    const elementIds = result.elements.map((e) => e.id);
    const sortedElementIds = [...elementIds].sort();
    expect(elementIds).toEqual(sortedElementIds);

    const relationIds = result.relations.map((r) => r.id);
    const sortedRelationIds = [...relationIds].sort();
    expect(relationIds).toEqual(sortedRelationIds);
  });

  test("full payments workspace round-trip preserves all elements and relationships", () => {
    const result = exportToLikeC4(createPaymentsWorkspace());

    expect(result.elements.length).toBe(5);
    expect(result.relations.length).toBe(3);
    expect(result.views.length).toBe(2);

    const kinds = result.elements.map((e) => e.kind).sort();
    expect(kinds).toContain("actor");
    expect(kinds).toContain("system");
    expect(kinds.filter((k) => k === "container").length).toBe(2);
    expect(kinds).toContain("database");
  });

  test("sanitizes IDs with special characters", () => {
    const ws = workspace("Test", (w) => {
      const user = w.model.add(person("User"));
      const app = w.model.add(softwareSystem("App"));
      user.uses(app, "Uses");
    });
    const result = exportToLikeC4(ws);

    for (const element of result.elements) {
      expect(element.id).toMatch(/^[a-zA-Z0-9_]+$/);
    }
    for (const rel of result.relations) {
      expect(rel.id).toMatch(/^[a-zA-Z0-9_]+$/);
      expect(rel.source).toMatch(/^[a-zA-Z0-9_]+$/);
      expect(rel.target).toMatch(/^[a-zA-Z0-9_]+$/);
    }
  });
});
