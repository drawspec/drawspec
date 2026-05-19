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
    const kinds = new Set(doc.nodes.map((n) => `${n.kind}:${n.label}`));
    expect(kinds.has("deployment-node:Web Server")).toBe(true);
    expect(kinds.has("infrastructure-node:Database")).toBe(true);
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
    expect(new Set(artifactNodes.map((n) => n.label))).toEqual(new Set(["API Service", "Worker"]));

    const serverNode = doc.nodes.find((n) => n.kind === "deployment-node");
    for (const art of artifactNodes) {
      expect(art.parentId).toBe(serverNode?.id);
    }

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

  test("emits diagnostic for unresolved communication path endpoints", () => {
    const doc = deploymentDiagram("BadPath", (d) => {
      d.deploymentNode("A");
      d.communicationPath("A", "NonExistent");
    });

    expect(doc.edges).toHaveLength(0);
    expect(doc.diagnostics?.map((d) => d.code)).toEqual(["deployment/unresolved-endpoint"]);
  });

  test("duplicate node names get unique IDs", () => {
    const doc = deploymentDiagram("DupNodes", (d) => {
      d.deploymentNode("Server");
      d.deploymentNode("Server");
    });

    const ids = doc.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(2);
  });

  test("deploymentNode returns node ID for reference safety", () => {
    let returnedId = "";
    deploymentDiagram("IdRef", (d) => {
      returnedId = d.deploymentNode("Web Server");
    });
    const doc = deploymentDiagram("IdRef", (d) => {
      d.deploymentNode("Web Server");
    });
    const node = doc.nodes.find((n) => n.kind === "deployment-node");
    expect(returnedId).toBe(node?.id);
  });
});
