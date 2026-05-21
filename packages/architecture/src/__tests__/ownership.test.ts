import { describe, expect, test } from "bun:test";
import { container, person, softwareSystem, workspace } from "../index";
import type { OwnerMetadata } from "../types";

describe("element ownership metadata", () => {
  test("element accepts string owner (backward compatible)", () => {
    const api = softwareSystem("API", { owner: "Team Alpha" });
    expect(api.owner).toBe("Team Alpha");
  });

  test("element accepts structured OwnerMetadata", () => {
    const owner: OwnerMetadata = { team: "Platform", individual: "Alice", escalation: "Bob" };
    const api = softwareSystem("API", { owner });
    expect(api.owner).toEqual(owner);
  });

  test("element accepts partial OwnerMetadata", () => {
    const api = softwareSystem("API", { owner: { team: "Backend" } });
    expect(api.owner).toEqual({ team: "Backend" });
  });

  test("element defaults owner to undefined", () => {
    const api = softwareSystem("API");
    expect(api.owner).toBeUndefined();
  });

  test("container inherits OwnerMetadata through options", () => {
    const ws = workspace("Owner", (w) => {
      const system = w.model.add(
        softwareSystem("Platform", { owner: { team: "Core", escalation: "CTO" } })
      );
      system.add(container("API", { owner: { team: "API Team", individual: "Carol" } }));
    });
    const system = ws.model.elements.find((e) => e.name === "Platform");
    const api = system?.children.find((e) => e.name === "API");
    expect(system?.owner).toEqual({ team: "Core", escalation: "CTO" });
    expect(api?.owner).toEqual({ team: "API Team", individual: "Carol" });
  });

  test("person accepts OwnerMetadata", () => {
    const user = person("Admin", { owner: { individual: "Dave" } });
    expect(user.owner).toEqual({ individual: "Dave" });
  });
});
