import { describe, expect, test } from "bun:test";
import { deploymentDiagram } from "../index";

describe("deploymentDiagram", () => {
  test("creates deployment and infrastructure nodes with correct kinds", () => {
    const doc = deploymentDiagram("Kinds", (d) => {
      d.deploymentNode("Web Server");
      d.infrastructureNode("Database");
    });

    expect(doc.kind).toBe("deployment");
    expect(doc.schemaVersion).toBe("1.0.0");
    const kinds = doc.nodes.map((n) => ({ kind: n.kind, label: n.label }));
    expect(kinds).toContainEqual({ kind: "deployment-node", label: "Web Server" });
    expect(kinds).toContainEqual({ kind: "infrastructure-node", label: "Database" });
  });

  test("artifacts nest within deployment nodes as child nodes and groups", () => {
    const doc = deploymentDiagram("Artifacts", (d) => {
      d.deploymentNode("App Server", (n) => {
        n.artifact("API Service");
        n.artifact("Worker");
      });
    });

    const artifactNodes = doc.nodes.filter((n) => n.kind === "artifact");
    expect(artifactNodes).toHaveLength(2);
    expect(artifactNodes.map((n) => n.label)).toEqual(["API Service", "Worker"]);

    const parentIds = artifactNodes.map((n) => n.parentId);
    const serverNode = doc.nodes.find((n) => n.kind === "deployment-node");
    expect(parentIds).toEqual([serverNode?.id, serverNode?.id]);

    expect(doc.groups).toHaveLength(1);
    expect(doc.groups[0]?.kind).toBe("deployment-node");
    expect(doc.groups[0]?.childIds).toEqual(artifactNodes.map((a) => a.id).sort());
  });

  test("communication paths create edges with protocol labels", () => {
    const doc = deploymentDiagram("Paths", (d) => {
      d.deploymentNode("Web Server");
      d.deploymentNode("App Server");
      d.communicationPath("Web Server", "App Server", { protocol: "HTTPS" });
    });

    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0]?.kind).toBe("communication");
    expect(doc.edges[0]?.label).toBe("HTTPS");
    expect(doc.edges[0]?.direction).toBe("none");

    const webId = doc.nodes.find((n) => n.label === "Web Server")?.id;
    const appId = doc.nodes.find((n) => n.label === "App Server")?.id;
    expect(doc.edges[0]?.sourceId).toBe(webId);
    expect(doc.edges[0]?.targetId).toBe(appId);
  });

  test("properties are stored in node metadata", () => {
    const doc = deploymentDiagram("Props", (d) => {
      d.infrastructureNode("Database", (i) => {
        i.property("engine", "postgresql");
        i.property("version", "15");
      });
    });

    const db = doc.nodes.find((n) => n.kind === "infrastructure-node");
    expect(db?.metadata).toEqual({ engine: "postgresql", version: "15" });
  });

  test("produces deterministic IDs across runs", () => {
    const build = () =>
      deploymentDiagram("Stable", (d) => {
        d.deploymentNode("Web Server", (n) => {
          n.artifact("Frontend");
        });
        d.infrastructureNode("DB");
        d.communicationPath("Web Server", "DB", { protocol: "TCP" });
      });

    expect(build()).toEqual(build());
  });

  test("empty diagram produces a valid DiagramDocument", () => {
    const doc = deploymentDiagram("Empty");

    expect(doc).toMatchObject({
      schemaVersion: "1.0.0",
      title: "Empty",
      kind: "deployment",
      nodes: [],
      edges: [],
      groups: [],
      annotations: [],
    });
  });

  test("full production example compiles correctly", () => {
    const doc = deploymentDiagram("Production", (d) => {
      d.deploymentNode("Web Server", (n) => {
        n.artifact("Frontend App");
        n.artifact("Nginx Config");
      });
      d.deploymentNode("App Server", (n) => {
        n.artifact("API Service");
      });
      d.infrastructureNode("Database", (i) => {
        i.property("engine", "postgresql");
      });
      d.communicationPath("Web Server", "App Server", { protocol: "HTTPS" });
      d.communicationPath("App Server", "Database", { protocol: "TCP" });
    });

    expect(doc.kind).toBe("deployment");
    expect(doc.nodes.filter((n) => n.kind === "deployment-node")).toHaveLength(2);
    expect(doc.nodes.filter((n) => n.kind === "infrastructure-node")).toHaveLength(1);
    expect(doc.nodes.filter((n) => n.kind === "artifact")).toHaveLength(3);
    expect(doc.edges).toHaveLength(2);
    expect(doc.groups).toHaveLength(2);

    const httpsEdge = doc.edges.find((e) => e.label === "HTTPS");
    const tcpEdge = doc.edges.find((e) => e.label === "TCP");
    expect(httpsEdge).toBeDefined();
    expect(tcpEdge).toBeDefined();
  });

  test("communication path without protocol has no label", () => {
    const doc = deploymentDiagram("NoProtocol", (d) => {
      d.deploymentNode("A");
      d.deploymentNode("B");
      d.communicationPath("A", "B");
    });

    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0]?.label).toBeUndefined();
  });
});
