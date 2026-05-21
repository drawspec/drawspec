import { describe, expect, test } from "bun:test";
import {
  classifyElements,
  container,
  database,
  exportCatalogJson,
  exportCatalogYaml,
  extractServices,
  generateDependencyMatrix,
  person,
  softwareSystem,
  workspace,
} from "../index";

describe("service catalog integration hooks", () => {
  test("extracts service-like elements by kind and service tag", () => {
    const ws = workspace("Catalog", (w) => {
      const platform = w.model.add(
        softwareSystem("Platform", {
          id: "platform",
          description: "Core platform",
          owner: "team-platform",
          tags: ["critical"],
        })
      );
      platform.add(
        container("API", {
          id: "api",
          technology: "TypeScript",
          owner: { team: "team-api", escalation: "pager-api" },
        })
      );
      platform.add(database("Audit Log", { id: "audit", tags: ["service"] }));
      w.model.add(person("Customer", { id: "customer" }));
    });

    const services = extractServices(ws);
    expect(services.map((service) => service.id)).toEqual(["api", "audit", "platform"]);
    expect(services.find((service) => service.id === "platform")?.metadata).toEqual({
      description: "Core platform",
      owner: "team-platform",
    });
    expect(services.find((service) => service.id === "api")?.metadata).toEqual({
      technology: "TypeScript",
      owner: "team-api",
    });
    expect(services.find((service) => service.id === "audit")?.tags).toContain("service");
  });

  test("includes source relationship destinations as service dependencies", () => {
    const ws = workspace("Catalog", (w) => {
      const platform = w.model.add(softwareSystem("Platform", { id: "platform" }));
      const api = platform.add(container("API", { id: "api" }));
      const worker = platform.add(container("Worker", { id: "worker" }));
      const audit = platform.add(database("Audit", { id: "audit", tags: ["service"] }));
      api.uses(worker, "Queues work");
      api.uses(audit, "Writes audit events");
    });

    const api = extractServices(ws).find((service) => service.id === "api");
    expect(api?.dependencies).toEqual(["audit", "worker"]);
  });

  test("generates a dependency matrix ordered by service name", () => {
    const ws = workspace("Catalog", (w) => {
      const platform = w.model.add(softwareSystem("Platform", { id: "platform" }));
      const api = platform.add(container("API", { id: "api" }));
      const worker = platform.add(container("Worker", { id: "worker" }));
      const audit = platform.add(database("Audit", { id: "audit", tags: ["service"] }));
      api.uses(worker, "Queues work");
      worker.uses(audit, "Persists jobs");
    });

    const matrix = generateDependencyMatrix(ws);
    expect(matrix.headers).toEqual(["API", "Audit", "Platform", "Worker"]);
    expect(matrix.rows).toEqual([
      { service: "API", dependencies: [false, false, false, true] },
      { service: "Audit", dependencies: [false, false, false, false] },
      { service: "Platform", dependencies: [false, false, false, false] },
      { service: "Worker", dependencies: [false, true, false, false] },
    ]);
  });

  test("classifies elements by kind by default", () => {
    const ws = workspace("Catalog", (w) => {
      const platform = w.model.add(softwareSystem("Platform", { id: "platform" }));
      platform.add(container("API", { id: "api" }));
      w.model.add(person("Customer", { id: "customer" }));
    });

    const classified = classifyElements(ws);
    expect(classified.person?.map((element) => element.id)).toEqual(["customer"]);
    expect(classified.softwareSystem?.map((element) => element.id)).toEqual(["platform"]);
    expect(classified.container?.map((element) => element.id)).toEqual(["api"]);
  });

  test("classifies elements with a custom tag classifier", () => {
    const ws = workspace("Catalog", (w) => {
      const platform = w.model.add(
        softwareSystem("Platform", { id: "platform", tags: ["public"] })
      );
      platform.add(container("API", { id: "api", tags: ["internal"] }));
      platform.add(database("Audit", { id: "audit", tags: ["internal"] }));
    });

    const classified = classifyElements(ws, (element) =>
      element.tags.includes("internal") ? "internal" : "external"
    );
    expect(classified.external?.map((element) => element.id)).toEqual(["platform"]);
    expect(classified.internal?.map((element) => element.id)).toEqual(["api", "audit"]);
  });

  test("exports deterministic pretty-printed catalog JSON sorted by id", () => {
    const create = () =>
      workspace("Catalog", (w) => {
        const platform = w.model.add(softwareSystem("Platform", { id: "platform" }));
        platform.add(container("Worker", { id: "worker" }));
        platform.add(container("API", { id: "api" }));
      });

    const first = exportCatalogJson(create());
    const second = exportCatalogJson(create());
    expect(first).toBe(second);
    expect(JSON.parse(first).map((entry: { id: string }) => entry.id)).toEqual([
      "api",
      "platform",
      "worker",
    ]);
    expect(first).toContain("\n  {");
  });

  test("exports Backstage-compatible YAML documents", () => {
    const ws = workspace("Catalog", (w) => {
      const platform = w.model.add(
        softwareSystem("Platform", { id: "platform", owner: "team-platform" })
      );
      const api = platform.add(
        container("API", {
          id: "api",
          description: "Public API",
          owner: "team-api",
          tags: ["public"],
        })
      );
      const worker = platform.add(container("Worker", { id: "worker" }));
      api.uses(worker, "Queues work");
    });

    const yaml = exportCatalogYaml(ws);
    expect(yaml).toContain("---\napiVersion: backstage.io/v1alpha1\nkind: Component");
    expect(yaml).toContain('  name: "api"');
    expect(yaml).toContain('  description: "Public API"');
    expect(yaml).toContain('  tags: ["container", "public"]');
    expect(yaml).toContain('  type: "container"');
    expect(yaml).toContain('  owner: "team-api"');
    expect(yaml).toContain("  dependsOn:\n    - component:worker");
  });
});
