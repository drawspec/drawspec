import { componentDiagram } from "../../../packages/uml-component/src/index.js";

export default componentDiagram("Enterprise system", (d) => {
  d.component("Auth Service", (c) => {
    c.provides("IAuth");
    c.requires("IUserStore");
    c.provides("ISession");
  });

  d.component("User Store", (c) => {
    c.provides("IUserStore");
    c.requires("IDatabase");
  });

  d.component("PostgreSQL", (c) => {
    c.provides("IDatabase");
  });

  d.component("Notification Hub", (c) => {
    c.provides("INotification");
    c.requires("IEmailProvider");
    c.requires("ISmsProvider");
    c.requires("IPushProvider");
  });

  d.component("Email Provider", (c) => {
    c.provides("IEmailProvider");
  });

  d.component("SMS Provider", (c) => {
    c.provides("ISmsProvider");
  });

  d.component("Push Provider", (c) => {
    c.provides("IPushProvider");
  });

  d.component("Analytics Engine", (c) => {
    c.provides("IAnalytics");
    c.requires("IDatabase");
    c.requires("INotification");
  });

  d.dependency("Auth Service", "User Store");
  d.dependency("User Store", "PostgreSQL");
  d.dependency("Notification Hub", "Email Provider");
  d.dependency("Notification Hub", "SMS Provider");
  d.dependency("Notification Hub", "Push Provider");
  d.dependency("Analytics Engine", "PostgreSQL");
  d.dependency("Analytics Engine", "Notification Hub");
});
