import { describe, expect, test } from "bun:test";
import { container, createQuery, database, person, softwareSystem, workspace } from "../index";

function createTestWorkspace() {
  return workspace("Test", (w) => {
    const customer = w.model.add(person("Customer", { tags: ["external"] }));
    const frontend = w.model.add(softwareSystem("Frontend", { tags: ["internal", "frontend"] }));
    const backend = w.model.add(softwareSystem("Backend", { tags: ["internal", "backend"] }));
    const web = frontend.add(
      container("Web App", { technology: "TypeScript", tags: ["frontend"] })
    );
    const api = backend.add(container("API", { technology: "Bun", tags: ["backend", "api"] }));
    const db = backend.add(
      database("Ledger", { technology: "PostgreSQL", tags: ["backend", "storage"] })
    );

    customer.uses(web, "Opens", { technology: "HTTPS" });
    web.uses(api, "Calls", { technology: "REST", tags: ["sync"] });
    api.uses(db, "Reads/Writes", { technology: "SQL", tags: ["writes"] });
    api.uses(web, "Pushes updates", { technology: "WebSocket", tags: ["async"] });
  });
}

function byName(ws: ReturnType<typeof createTestWorkspace>) {
  const query = createQuery(ws.model);
  const all = query.elements();
  const find = (name: string) => {
    const el = all.find((e) => e.name === name);
    if (!el) throw new Error(`Element not found: ${name}`);
    return el;
  };
  return {
    query,
    customer: find("Customer"),
    frontend: find("Frontend"),
    backend: find("Backend"),
    web: find("Web App"),
    api: find("API"),
    db: find("Ledger"),
  };
}

describe("createQuery", () => {
  test("returns a query object for a model", () => {
    const ws = createTestWorkspace();
    const query = createQuery(ws.model);
    expect(query).toBeDefined();
    expect(typeof query.elements).toBe("function");
    expect(typeof query.relationships).toBe("function");
    expect(typeof query.path).toBe("function");
  });
});

describe("query.elements", () => {
  test("returns all elements including children with no filter", () => {
    const { query } = byName(createTestWorkspace());
    expect(query.elements()).toHaveLength(6);
  });

  test("filters by single tag", () => {
    const { query } = byName(createTestWorkspace());
    const result = query.elements({ tags: ["frontend"] });
    expect(result).toHaveLength(2);
    const names = result.map((e) => e.name).sort();
    expect(names).toEqual(["Frontend", "Web App"]);
  });

  test("filters by multiple tags (AND)", () => {
    const { query } = byName(createTestWorkspace());
    const result = query.elements({ tags: ["backend", "storage"] });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Ledger");
  });

  test("filters by negated tag", () => {
    const { query } = byName(createTestWorkspace());
    const result = query.elements({ tags: ["!external", "!frontend"] });
    const names = result.map((e) => e.name).sort();
    expect(names).toEqual(["API", "Backend", "Ledger"]);
  });

  test("filters by kind", () => {
    const { query } = byName(createTestWorkspace());
    const result = query.elements({ kind: "person" });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Customer");
  });

  test("filters by parent", () => {
    const { query, backend } = byName(createTestWorkspace());
    const children = query.elements({ parent: backend });
    const names = children.map((e) => e.name).sort();
    expect(names).toEqual(["API", "Ledger"]);
  });

  test("returns empty for non-matching filter", () => {
    const { query } = byName(createTestWorkspace());
    expect(query.elements({ tags: ["nonexistent"] })).toHaveLength(0);
  });
});

describe("query.relationships", () => {
  test("returns all relationships with no filter", () => {
    const { query } = byName(createTestWorkspace());
    expect(query.relationships()).toHaveLength(4);
  });

  test("filters by source element", () => {
    const { query, customer } = byName(createTestWorkspace());
    const result = query.relationships({ source: customer });
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("Opens");
  });

  test("filters by target element", () => {
    const { query, db } = byName(createTestWorkspace());
    const result = query.relationships({ target: db });
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("Reads/Writes");
  });

  test("filters by source and target", () => {
    const { query, web, api } = byName(createTestWorkspace());
    const result = query.relationships({ source: web, target: api });
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("Calls");
  });

  test("filters by tags", () => {
    const { query } = byName(createTestWorkspace());
    const result = query.relationships({ tags: ["writes"] });
    expect(result).toHaveLength(1);
    expect(result[0]?.technology).toBe("SQL");
  });

  test("filters by kind", () => {
    const { query } = byName(createTestWorkspace());
    const result = query.relationships({ kind: "uses" });
    expect(result).toHaveLength(4);
  });

  test("returns empty for non-matching source+target", () => {
    const { query, customer, db } = byName(createTestWorkspace());
    expect(query.relationships({ source: customer, target: db })).toHaveLength(0);
  });
});

describe("query.path", () => {
  test("finds direct path between connected elements", () => {
    const { query, customer, web } = byName(createTestWorkspace());
    const result = query.path(customer, web);
    expect(result.found).toBe(true);
    expect(result.elements).toHaveLength(2);
    expect(result.elements[0]?.name).toBe("Customer");
    expect(result.elements[1]?.name).toBe("Web App");
    expect(result.relationships).toHaveLength(1);
  });

  test("finds multi-hop path", () => {
    const { query, customer, db } = byName(createTestWorkspace());
    const result = query.path(customer, db);
    expect(result.found).toBe(true);
    expect(result.elements.map((e) => e.name)).toEqual(["Customer", "Web App", "API", "Ledger"]);
    expect(result.relationships).toHaveLength(3);
  });

  test("returns same element for self-path", () => {
    const { query, customer } = byName(createTestWorkspace());
    const result = query.path(customer, customer);
    expect(result.found).toBe(true);
    expect(result.elements).toHaveLength(1);
    expect(result.relationships).toHaveLength(0);
  });

  test("respects maxDepth option", () => {
    const { query, customer, db } = byName(createTestWorkspace());
    const result = query.path(customer, db, { maxDepth: 1 });
    expect(result.found).toBe(false);
    expect(result.elements).toHaveLength(0);
  });

  test("finds reverse path when direction is both", () => {
    const { query, db, customer } = byName(createTestWorkspace());
    const result = query.path(db, customer, { direction: "both" });
    expect(result.found).toBe(true);
    expect(result.elements.length).toBeGreaterThan(1);
  });

  test("finds reverse path when direction is reverse", () => {
    const { query, api, customer } = byName(createTestWorkspace());
    const result = query.path(api, customer, { direction: "reverse" });
    expect(result.found).toBe(true);
    expect(result.elements.length).toBeGreaterThan(1);
  });

  test("returns not found for disconnected elements", () => {
    const ws = workspace("Disconnected", (w) => {
      w.model.add(person("A"));
      w.model.add(person("B"));
    });
    const query = createQuery(ws.model);
    const all = query.elements();
    const a = all[0];
    const b = all[1];
    if (!a || !b) throw new Error("Expected 2 elements");
    const result = query.path(a, b);
    expect(result.found).toBe(false);
  });

  test("no path in forward-only direction for reverse edge", () => {
    const { query, api, customer } = byName(createTestWorkspace());
    const result = query.path(api, customer, { direction: "forward" });
    expect(result.found).toBe(false);
  });
});
