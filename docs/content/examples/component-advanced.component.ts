import { componentDiagram, component, dependency, interface_ as iface } from "../../../packages/uml-component/src/index.js";

export default componentDiagram("Enterprise system", (d) => {
  const auth = d.component("Auth Service", (c) => {
    c.provides("IAuth");
    c.requires("IUserStore");
    c.provides("ISession");
  });

  const userStore = d.component("User Store", (c) => {
    c.provides("IUserStore");
    c.requires("IDatabase");
  });

  const database = d.component("PostgreSQL", (c) => {
    c.provides("IDatabase");
  });

  const notification = d.component("Notification Hub", (c) => {
    c.provides("INotification");
    c.requires("IEmailProvider");
    c.requires("ISmsProvider");
    c.requires("IPushProvider");
  });

  const emailProvider = d.component("Email Provider", (c) => {
    c.provides("IEmailProvider");
  });

  const smsProvider = d.component("SMS Provider", (c) => {
    c.provides("ISmsProvider");
  });

  const pushProvider = d.component("Push Provider", (c) => {
    c.provides("IPushProvider");
  });

  const analytics = d.component("Analytics Engine", (c) => {
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