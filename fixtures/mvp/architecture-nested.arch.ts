import {
  container,
  database,
  person,
  softwareSystem,
  workspace,
} from "../../packages/architecture/src";

const identity = workspace("Identity platform", (ws) => {
  const identitySystem = ws.model.add(softwareSystem("Identity"));
  identitySystem.add(container("OIDC Provider", { technology: "Bun" }));
});

export default workspace("Nested commerce platform", (ws) => {
  ws.model.use(identity.model);
  const operator = ws.model.add(person("Operator"));
  const commerce = ws.model.add(softwareSystem("Commerce"));
  const dashboard = commerce.add(container("Admin Dashboard", { technology: "React" }));
  const api = commerce.add(container("Admin API", { technology: "Bun" }));
  const store = commerce.add(database("Configuration Store", { technology: "SQLite" }));

  operator.uses(dashboard, "Configures payment rules", { technology: "HTTPS" });
  dashboard.uses(api, "Saves changes", { technology: "HTTPS" });
  api.uses(store, "Persists settings", { technology: "SQL" });

  ws.views.container(commerce, "nested-commerce-containers", (view) =>
    view.include("*").autoLayout("top-down")
  );
});
