import { describe, expect, test } from "bun:test";
import {
  compareSnapshots,
  container,
  database,
  detectDrift,
  generateDriftReport,
  snapshotModel,
  softwareSystem,
  workspace,
} from "../index";

describe("snapshotModel", () => {
  test("captures a serializable deep-cloned snapshot", () => {
    const ws = workspace("Snapshot", (w) => {
      const system = w.model.add(
        softwareSystem("System", {
          id: "system",
          properties: { nested: { value: "before" } },
        })
      );
      system.add(container("API", { id: "api", technology: "Bun" }));
    });

    const snapshot = snapshotModel(ws);
    const liveSystem = ws.model.elements.find((item) => item.id === "system");
    const element = snapshot.elements.find((item) => item.id === "system");
    if (!element || !liveSystem) throw new Error("Expected system element");

    expect(snapshot.workspaceId).toBe(ws.id);
    expect(snapshot.workspaceName).toBe("Snapshot");
    expect(snapshot.elements.map((item) => item.id)).toEqual(["api", "system"]);
    expect(snapshot.relationships).toHaveLength(0);
    expect(JSON.parse(JSON.stringify(snapshot)).workspaceName).toBe("Snapshot");

    const clonedProperties = element.properties as { nested: { value: string } };
    clonedProperties.nested.value = "after";
    expect((liveSystem.properties.nested as { value: string }).value).toBe("before");
  });
});

describe("compareSnapshots", () => {
  test("detects added, removed, and modified elements", () => {
    const before = snapshotModel(
      workspace("Before", (w) => {
        w.model.add(softwareSystem("Old", { id: "removed" }));
        w.model.add(
          softwareSystem("App", {
            id: "app",
            description: "Old description",
            technology: "TypeScript",
            tags: ["frontend"],
            properties: { tier: "edge" },
          })
        );
      })
    );
    const after = snapshotModel(
      workspace("After", (w) => {
        w.model.add(
          softwareSystem("App", {
            id: "app",
            description: "New description",
            technology: "Bun",
            tags: ["backend"],
            properties: { tier: "core" },
          })
        );
        w.model.add(softwareSystem("New", { id: "added" }));
      })
    );

    const report = compareSnapshots(before, after);

    expect(report.summary.elementsAdded).toBe(1);
    expect(report.summary.elementsRemoved).toBe(1);
    expect(report.summary.elementsModified).toBe(1);
    const modified = report.changes.find(
      (change) => change.id === "app" && change.type === "modified"
    );
    expect(modified?.details?.description).toEqual({
      before: "Old description",
      after: "New description",
    });
    expect(modified?.details?.technology).toEqual({ before: "TypeScript", after: "Bun" });
    expect(modified?.details?.tags).toEqual({
      before: ["frontend", "softwareSystem"],
      after: ["backend", "softwareSystem"],
    });
    expect(modified?.details?.properties).toEqual({
      before: { tier: "edge" },
      after: { tier: "core" },
    });
  });

  test("detects relationship drift", () => {
    const before = snapshotModel(
      workspace("Before", (w) => {
        const app = w.model.add(softwareSystem("App", { id: "app" }));
        const api = w.model.add(softwareSystem("API", { id: "api" }));
        app.uses(api, "Calls", { id: "app-api", technology: "REST", tags: ["sync"] });
      })
    );
    const after = snapshotModel(
      workspace("After", (w) => {
        const app = w.model.add(softwareSystem("App", { id: "app" }));
        const worker = w.model.add(softwareSystem("Worker", { id: "worker" }));
        app.uses(worker, "Publishes", {
          id: "app-api",
          technology: "NATS",
          tags: ["async"],
        });
      })
    );

    const report = compareSnapshots(before, after);
    const relationship = report.changes.find(
      (change) => change.elementType === "relationship" && change.type === "modified"
    );

    expect(report.summary.relationshipsModified).toBe(1);
    expect(relationship?.details?.destinationId).toEqual({ before: "api", after: "worker" });
    expect(relationship?.details?.label).toEqual({ before: "Calls", after: "Publishes" });
    expect(relationship?.details?.technology).toEqual({ before: "REST", after: "NATS" });
    expect(relationship?.details?.tags).toEqual({
      before: ["relationship", "sync"],
      after: ["async", "relationship"],
    });
  });

  test("handles empty snapshots", () => {
    const before = snapshotModel(workspace("Before", () => {}));
    const after = snapshotModel(workspace("After", () => {}));

    const report = compareSnapshots(before, after);

    expect(report.summary.totalChanges).toBe(0);
    expect(report.changes).toHaveLength(0);
  });
});

describe("detectDrift", () => {
  test("compares architecture elements with code metadata", () => {
    const ws = workspace("Runtime", (w) => {
      w.model.add(softwareSystem("Documented", { id: "model-only" }));
      w.model.add(softwareSystem("Service", { id: "shared", tags: ["api"] }));
    });

    const report = detectDrift(ws, {
      elements: [
        { id: "shared", name: "Service v2", tags: ["api", "runtime"] },
        { id: "code-only", name: "Discovered" },
      ],
    });

    expect(report.summary.elementsAdded).toBe(1);
    expect(report.summary.elementsRemoved).toBe(1);
    expect(report.summary.elementsModified).toBe(1);
    expect(report.changes.find((change) => change.id === "code-only")?.type).toBe("added");
    expect(report.changes.find((change) => change.id === "model-only")?.type).toBe("removed");
    expect(report.changes.find((change) => change.id === "shared")?.details?.name).toEqual({
      before: "Service",
      after: "Service v2",
    });
  });

  test("optionally compares relationship metadata from code", () => {
    const ws = workspace("Runtime", (w) => {
      const app = w.model.add(softwareSystem("App", { id: "app" }));
      const db = w.model.add(database("DB", { id: "db", technology: "PostgreSQL" }));
      app.uses(db, "Reads", { id: "app-db", technology: "SQL" });
    });

    const report = detectDrift(ws, {
      elements: [
        { id: "app", name: "App" },
        { id: "db", name: "DB" },
      ],
      relationships: [{ id: "app-db", destinationId: "cache", technology: "Redis" }],
    });

    const relationship = report.changes.find((change) => change.id === "app-db");
    expect(report.summary.relationshipsModified).toBe(1);
    expect(relationship?.details?.destinationId).toEqual({ before: "db", after: "cache" });
    expect(relationship?.details?.technology).toEqual({ before: "SQL", after: "Redis" });
  });
});

describe("generateDriftReport", () => {
  test("renders a readable markdown report", () => {
    const ws = workspace("Report", (w) => {
      w.model.add(softwareSystem("App", { id: "app" }));
    });
    const report = detectDrift(ws, { elements: [{ id: "runtime", name: "Runtime" }] });
    const markdown = generateDriftReport(report);

    expect(markdown).toContain("# Drift Report");
    expect(markdown).toContain("## Added Elements");
    expect(markdown).toContain("## Removed Elements");
    expect(markdown).toContain("## Modified Elements");
    expect(markdown).toContain("## Relationship Changes");
    expect(markdown).toContain("`runtime`");
    expect(markdown).toContain("`app`");
  });
});
