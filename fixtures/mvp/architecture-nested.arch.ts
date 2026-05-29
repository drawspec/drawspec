import {
  container,
  database,
  person,
  softwareSystem,
  workspace,
} from "../../packages/architecture/src";

export default workspace("Nested commerce platform", (ws) => {
  const identitySystem = ws.model.add(softwareSystem("Identity", { description: "OIDC provider" }));
  const oidcProvider = identitySystem.add(container("OIDC Provider", { technology: "Bun" }));
  const operator = ws.model.add(person("Operator"));
  const commerce = ws.model.add(softwareSystem("Commerce"));
  const dashboard = commerce.add(container("Admin Dashboard", { technology: "React" }));
  const api = commerce.add(container("Admin API", { technology: "Bun" }));
  const store = commerce.add(database("Configuration Store", { technology: "SQLite" }));

  operator.uses(dashboard, "Configures payment rules", { technology: "HTTPS" });
  dashboard.uses(api, "Saves changes", { technology: "HTTPS" });
  api.uses(store, "Persists settings", { technology: "SQL" });
  operator.uses(commerce, "Manages store", { technology: "HTTPS" });
  operator.uses(identitySystem, "Authenticates via", { technology: "OIDC" });
  oidcProvider.uses(api, "Validates tokens", { technology: "HTTPS" });

  ws.views.container(commerce, "nested-commerce-containers", (view) =>
    view.include("*").autoLayout("top-down")
  );
});
