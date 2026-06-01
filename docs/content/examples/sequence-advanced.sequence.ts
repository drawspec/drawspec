import { sequence } from "../../../packages/uml-sequence/src/index.js";

export default sequence("Service health check", (seq) => {
  const monitor = seq.actor("Monitor");
  const api = seq.participant("API");
  const cache = seq.participant("Cache");
  const db = seq.participant("Database");

  monitor.note("Regular health checks every 30s");

  monitor.to(api, "GET /health");
  api.note("Health check endpoint");

  api.to(cache, "GET status");
  cache.to(api, "Cached: OK");

  seq.alt("cache hit", () => {
    cache.to(api, "Cached metrics available");
  }).else("cache miss", () => {
    api.to(db, "SELECT health FROM status");
    db.to(api, "{ status: healthy }");
  });

  api.to(api, "Aggregate metrics").note("Self-call for local aggregation");

  api.to(monitor, "200 OK + metrics");
});
