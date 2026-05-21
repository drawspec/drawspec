import { describe, expect, test } from "bun:test";
import type { ArchitectureElement } from "../index";
import {
  compileWorkspace,
  container,
  database,
  generateViews,
  person,
  softwareSystem,
  workspace,
} from "../index";

type GeneratedView = ReturnType<typeof generateViews>[number];

function createViewWorkspace() {
  return workspace("Dynamic Views", (w) => {
    const customer = w.model.add(person("Customer", { tags: ["external"] }));
    const payments = w.model.add(softwareSystem("Payments", { tags: ["backend"] }));
    const storefront = w.model.add(softwareSystem("Storefront", { tags: ["frontend"] }));
    const web = storefront.add(container("Web App", { tags: ["frontend"] }));
    const api = payments.add(container("Payment API", { tags: ["backend", "api"] }));
    const ledger = payments.add(database("Ledger", { tags: ["backend", "storage"] }));

    customer.uses(web, "Browses");
    web.uses(api, "Submits payment", { tags: ["sync"] });
    api.uses(ledger, "Stores transaction", { tags: ["writes"] });
    payments.uses(storefront, "Publishes checkout events");
  });
}

function requireView(view: GeneratedView | undefined): GeneratedView {
  expect(view).toBeDefined();
  if (view === undefined) throw new Error("Expected generated view");
  return view;
}

function viewNames(
  view: { readonly elements?: readonly string[] },
  ws: ReturnType<typeof createViewWorkspace>
) {
  const all = flatten(ws.model.elements);
  const byId = new Map(all.map((element) => [element.id, element.name]));
  return [...(view.elements ?? [])].map((id) => byId.get(id)).sort();
}

function relationshipLabels(
  view: { readonly relationships?: readonly string[] },
  ws: ReturnType<typeof createViewWorkspace>
) {
  const byId = new Map(
    ws.model.relationships.map((relationship) => [relationship.id, relationship.label])
  );
  return [...(view.relationships ?? [])].map((id) => byId.get(id)).sort();
}

function flatten(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  const result: ArchitectureElement[] = [];
  const stack = [...elements];
  while (stack.length > 0) {
    const element = stack.shift();
    if (!element) continue;
    result.push(element);
    stack.push(...element.children);
  }
  return result;
}

describe("generateViews", () => {
  test("creates a tag-based view with matching relationships", () => {
    const ws = createViewWorkspace();
    const [maybeView] = generateViews(ws.model, {
      strategy: "tags",
      include: ["frontend", "backend"],
    });
    const view = requireView(maybeView);

    expect(view.title).toBe("Elements tagged frontend, backend");
    expect(viewNames(view, ws)).toEqual([
      "Ledger",
      "Payment API",
      "Payments",
      "Storefront",
      "Web App",
    ]);
    expect(relationshipLabels(view, ws)).toEqual([
      "Publishes checkout events",
      "Stores transaction",
      "Submits payment",
    ]);
  });

  test("creates a kind-based view", () => {
    const ws = createViewWorkspace();
    const [maybeView] = generateViews(ws.model, {
      strategy: "kinds",
      include: ["component", "container"],
    });
    const view = requireView(maybeView);

    expect(viewNames(view, ws)).toEqual(["Payment API", "Web App"]);
    expect(relationshipLabels(view, ws)).toEqual(["Submits payment"]);
  });

  test("traces dependency paths from seed elements up to maxDepth", () => {
    const ws = createViewWorkspace();
    const [maybeView] = generateViews(ws.model, {
      strategy: "paths",
      seeds: ["Web App"],
      maxDepth: 2,
    });
    const view = requireView(maybeView);

    expect(viewNames(view, ws)).toEqual(["Ledger", "Payment API", "Web App"]);
    expect(relationshipLabels(view, ws)).toEqual(["Stores transaction", "Submits payment"]);
  });

  test("creates landscape and per-system auto views", () => {
    const ws = createViewWorkspace();
    const views = generateViews(ws.model, { strategy: "auto" });

    expect(views).toHaveLength(3);
    const landscape = requireView(views.find((view) => view.key === "system-landscape"));
    expect(viewNames(landscape, ws)).toEqual(["Payments", "Storefront"]);
    expect(relationshipLabels(landscape, ws)).toEqual(["Publishes checkout events"]);

    const paymentsView = requireView(views.find((view) => view.title === "Payments dependencies"));
    expect(viewNames(paymentsView, ws)).toEqual(["Ledger", "Payment API", "Payments"]);
  });

  test("compileWorkspace generates auto views when none are declared", () => {
    const ws = createViewWorkspace();
    const docs = compileWorkspace(ws);

    expect(docs).toHaveLength(3);
    expect(docs.some((doc) => doc.title === "System landscape")).toBe(true);
    expect(docs.some((doc) => doc.title === "Payments dependencies")).toBe(true);
  });
});
