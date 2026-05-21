import { sequence } from "@drawspec/uml-sequence";

export default sequence("User Login", (s) => {
  const user = s.actor("User");
  const browser = s.participant("Browser");
  const server = s.participant("Auth Server");

  user.to(browser, "Navigate to /login");
  browser.to(server, "POST /api/auth/login");
  server.to(browser, "200 OK + JWT").note("Token expires in 1h");
  browser.to(user, "Redirect to dashboard");

  s.alt("Invalid credentials", (s2) => {
    server.to(browser, "401 Unauthorized");
    browser.to(user, "Show error message");
  });
});
