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
    const server2 = s2.participant("Auth Server");
    const browser2 = s2.participant("Browser");

    server2.to(browser2, "401 Unauthorized");
    browser2.to(s2.actor("User"), "Show error message");
  });
});
