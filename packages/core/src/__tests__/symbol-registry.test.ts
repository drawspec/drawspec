import { describe, expect, test } from "bun:test";
import { SymbolRegistry } from "../index";

describe("SymbolRegistry", () => {
  test("resolves names to IDs in the current scope", () => {
    const registry = new SymbolRegistry();

    const diagnostic = registry.register("Api", "node_api");
    expect(diagnostic).toBeNull();
    expect(registry.resolve("Api")).toBe("node_api");
    expect(registry.has("Api")).toBe(true);
  });

  test("nested scopes can see parent symbols", () => {
    const registry = new SymbolRegistry();
    registry.register("Platform", "group_platform");
    registry.enterScope("Platform");

    expect(registry.resolve("Platform")).toBe("group_platform");
  });

  test("parent scopes cannot see child symbols after exit", () => {
    const registry = new SymbolRegistry();
    registry.enterScope("Platform");
    registry.register("Api", "node_api");
    registry.exitScope();

    expect(registry.resolve("Api")).toBeUndefined();
    expect(registry.has("Api")).toBe(false);
  });

  test("scope isolation allows the same name to resolve differently", () => {
    const registry = new SymbolRegistry();
    registry.register("Api", "node_root_api");
    registry.enterScope("PackageA");
    const diagnostic = registry.register("Api", "node_package_api");
    expect(diagnostic).toBeNull();

    expect(registry.resolve("Api")).toBe("node_package_api");

    registry.exitScope();

    expect(registry.resolve("Api")).toBe("node_root_api");
  });

  test("registering duplicate name in same scope returns diagnostic", () => {
    const registry = new SymbolRegistry();
    registry.register("Api", "node_api");

    const diagnostic = registry.register("Api", "node_api_2");

    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.code).toBe("DS_CORE_ID_COLLISION");
    expect(diagnostic?.severity).toBe("error");
    expect(diagnostic?.message).toContain("Duplicate diagram element ID");
    expect(diagnostic?.target).toBe("node_api_2");
  });

  test("registering same name in different scope works (shadowing)", () => {
    const registry = new SymbolRegistry();
    registry.register("Api", "node_root_api");
    registry.enterScope("PackageA");

    const diagnostic = registry.register("Api", "node_package_api");

    expect(diagnostic).toBeNull();
    expect(registry.resolve("Api")).toBe("node_package_api");
  });

  test("currentScope returns the nested scope path", () => {
    const registry = new SymbolRegistry();

    expect(registry.currentScope()).toBe("/");

    registry.enterScope("Platform");
    registry.enterScope("Services");

    expect(registry.currentScope()).toBe("/Platform/Services");
  });

  test("exiting the root scope is rejected", () => {
    const registry = new SymbolRegistry();

    expect(() => registry.exitScope()).toThrow("Cannot exit the root symbol scope.");
  });
});
