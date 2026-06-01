import { describe, expect, test } from "bun:test";
import {
  type CatalogModel,
  type CatalogSyncAdapter,
  container,
  MockSyncAdapter,
  type SyncResult,
  softwareSystem,
  toCatalogModel,
  workspace,
} from "../index";

function createTestModel(): CatalogModel {
  const ws = workspace("TestCatalog", (w) => {
    const platform = w.model.add(
      softwareSystem("Platform", { id: "platform", owner: "team-platform" })
    );
    const api = platform.add(
      container("API", {
        id: "api",
        description: "Public API",
        technology: "TypeScript",
        owner: "team-api",
        tags: ["public"],
      })
    );
    const worker = platform.add(container("Worker", { id: "worker" }));
    api.uses(worker, "Queues work");
  });
  return toCatalogModel(ws);
}

describe("CatalogSyncAdapter interface contract", () => {
  test("MockSyncAdapter implements CatalogSyncAdapter", () => {
    const adapter: CatalogSyncAdapter = new MockSyncAdapter();
    expect(adapter.name).toBe("Mock");
    expect(typeof adapter.push).toBe("function");
    expect(typeof adapter.pull).toBe("function");
    expect(typeof adapter.validate).toBe("function");
  });

  test("push returns SyncResult with per-entity details", async () => {
    const adapter = new MockSyncAdapter();
    const model = createTestModel();
    const result: SyncResult = await adapter.push(model);

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(3);
    expect(result.failedCount).toBe(0);
    expect(result.entities).toHaveLength(3);
    expect(result.entities[0]?.id).toBe("api");
    expect(result.entities[0]?.success).toBe(true);
    expect(result.entities[0]?.message).toBe("created");
  });

  test("push stores models for later inspection", async () => {
    const adapter = new MockSyncAdapter();
    const model = createTestModel();
    await adapter.push(model);

    expect(adapter.pushedModels).toHaveLength(1);
    expect(adapter.pushedModels[0]?.source).toBe("TestCatalog");
    expect(adapter.pushedModels[0]?.services).toHaveLength(3);
  });

  test("pull returns last pushed model", async () => {
    const adapter = new MockSyncAdapter();
    const model = createTestModel();
    await adapter.push(model);

    const pulled = await adapter.pull();
    expect(pulled.source).toBe("TestCatalog");
    expect(pulled.services).toHaveLength(3);
    expect(pulled.services.map((s) => s.id).sort()).toEqual(["api", "platform", "worker"]);
  });

  test("pull returns empty model when nothing has been pushed", async () => {
    const adapter = new MockSyncAdapter();
    const pulled = await adapter.pull();

    expect(pulled.source).toBe("mock");
    expect(pulled.services).toHaveLength(0);
    expect(pulled.generatedAt).toBeTruthy();
  });

  test("validate returns true by default", async () => {
    const adapter = new MockSyncAdapter();
    expect(await adapter.validate()).toBe(true);
  });

  test("validate returns false when configured", async () => {
    const adapter = new MockSyncAdapter({ valid: false });
    expect(await adapter.validate()).toBe(false);
  });
});

describe("toCatalogModel", () => {
  test("converts workspace to normalized CatalogModel", () => {
    const model = createTestModel();

    expect(model.source).toBe("TestCatalog");
    expect(model.generatedAt).toBeTruthy();
    expect(model.services).toHaveLength(3);

    const api = model.services.find((s) => s.id === "api");
    expect(api?.name).toBe("API");
    expect(api?.type).toBe("container");
    expect(api?.description).toBe("Public API");
    expect(api?.technology).toBe("TypeScript");
    expect(api?.owner).toBe("team-api");
    expect(api?.tags).toContain("container");
    expect(api?.tags).toContain("public");
    expect(api?.dependencies).toEqual(["worker"]);
  });

  test("includes owner metadata on services", () => {
    const model = createTestModel();
    const platform = model.services.find((s) => s.id === "platform");
    expect(platform?.owner).toBe("team-platform");
  });

  test("produces deterministic output for identical workspaces", () => {
    const createModel = () =>
      toCatalogModel(
        workspace("Det", (w) => {
          const sys = w.model.add(softwareSystem("Sys", { id: "sys" }));
          sys.add(container("A", { id: "a" }));
          sys.add(container("B", { id: "b" }));
        })
      );

    const first = createModel();
    const second = createModel();

    expect(first.services.map((s) => s.id)).toEqual(second.services.map((s) => s.id));
    expect(first.source).toBe(second.source);
  });
});
