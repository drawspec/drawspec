import { sequence } from "@drawspec/uml-sequence";

/**
 * Sequence diagram showing a basic HTTP request flow.
 * Imported by VitePress pages to render inline.
 */
export const loginFlow = sequence("Login Flow", (s) => {
  const client = s.actor("Client");
  const api = s.participant("API Server");
  const db = s.participant("Database");

  client.to(api, "POST /login");
  api.to(db, "SELECT user WHERE email=?");
  db.to(api, "User record");
  api.to(client, "200 OK + token").note("JWT, 1h expiry");
});
