import { describe, expect, test } from "bun:test";
import { treeLayout } from "@drawspec/layout-tree";
import { renderSvg } from "@drawspec/renderer-svg";
import {
  BRANCH_COLORS,
  compileMindmapDocument,
  lightenColor,
  MindmapBuilder,
  mapShape,
  mindmap,
} from "../index";
import type { MindmapDomainModel } from "../types";

async function expectGolden(name: string, svg: string): Promise<void> {
  const path = new URL(`./golden/${name}.svg`, import.meta.url).pathname;
  if (Bun.env.UPDATE_GOLDEN === "1") {
    await Bun.write(path, svg);
  }
  expect(await Bun.file(path).text()).toBe(svg);
}

describe("@drawspec/mindmap", () => {
  test("compiles a simple mindmap with root and children", () => {
    const doc = mindmap("Simple", (m) => {
      m.root("Center").node("A").node("B").node("C");
    });

    expect(doc.kind).toBe("mindmap");
    expect(doc.title).toBe("Simple");
    expect(doc.nodes).toHaveLength(4);
    expect(doc.edges).toHaveLength(3);
    expect(doc.nodes.find((n) => n.kind === "mindmap-root")?.label).toBe("Center");
    expect(doc.edges.every((e) => e.kind === "mindmap-branch")).toBe(true);
    expect(doc.edges.every((e) => e.direction === "none")).toBe(true);
  });

  test("compiles nested children via .children() callback", () => {
    const doc = mindmap("Nested", (m) => {
      m.root("Root")
        .node("Branch A")
        .children((c) => {
          c.node("A1").node("A2");
        })
        .node("Branch B");
    });

    expect(doc.nodes).toHaveLength(5);
    expect(doc.edges).toHaveLength(4);
    const rootId = doc.nodes.find((n) => n.kind === "mindmap-root")?.id;
    expect(doc.edges.filter((e) => e.sourceId === rootId)).toHaveLength(2);
  });

  test("assigns branch colors from palette", () => {
    const doc = mindmap("Colors", (m) => {
      m.root("Center")
        .node("B1")
        .node("B2")
        .node("B3")
        .node("B4")
        .node("B5")
        .node("B6")
        .node("B7")
        .node("B8")
        .node("B9");
    });

    const rootId = doc.nodes.find((n) => n.kind === "mindmap-root")?.id;
    const childEdges = doc.edges.filter((e) => e.sourceId === rootId);
    expect(childEdges).toHaveLength(9);

    // Verify each child node has a branch color from the palette
    const childNodes = childEdges.map((e) => doc.nodes.find((n) => n.id === e.targetId));
    const childColors = childNodes.map((n) => n?.metadata?.branchColor as string);
    for (const color of childColors.slice(0, 8)) {
      expect(BRANCH_COLORS).toContain(color);
    }
    // Verify 9th child wraps around (palette has 8 colors)
    expect(BRANCH_COLORS).toContain(childColors[8]);
  });

  test("overrides branch color via node options", () => {
    const doc = mindmap("Custom Color", (m) => {
      m.root("R").node("A", { color: "#ff0000" }).node("B");
    });

    const nodeA = doc.nodes.find((n) => n.label === "A");
    const nodeB = doc.nodes.find((n) => n.label === "B");
    expect(nodeA?.metadata?.branchColor).toBe("#ff0000");
    expect(nodeB?.metadata?.branchColor).toBe(BRANCH_COLORS[1]);
  });

  test("maps shapes correctly", () => {
    const doc = mindmap("Shapes", (m) => {
      m.root("R")
        .node("Rounded", { shape: "rounded" })
        .node("Square", { shape: "square" })
        .node("Circle", { shape: "circle" })
        .node("Cloud", { shape: "cloud" })
        .node("Bang", { shape: "bang" });
    });

    expect(doc.nodes.find((n) => n.label === "Rounded")?.shape).toEqual({
      type: "rounded-rect",
      radius: 12,
    });
    expect(doc.nodes.find((n) => n.label === "Square")?.shape).toEqual({ type: "rect" });
    expect(doc.nodes.find((n) => n.label === "Circle")?.shape).toEqual({ type: "circle" });
    expect(doc.nodes.find((n) => n.label === "Cloud")?.shape).toEqual({
      type: "rounded-rect",
      radius: 20,
    });
    expect(doc.nodes.find((n) => n.label === "! Bang")?.shape).toEqual({
      type: "rounded-rect",
      radius: 8,
    });
    expect(doc.nodes.find((n) => n.label === "! Bang")).toBeDefined();
  });

  test("produces deterministic output", () => {
    const build = () =>
      mindmap("Determinism", (m) => {
        m.root("R")
          .node("A")
          .node("B")
          .children((c) => {
            c.node("B1");
          });
      });

    const first = build();
    const second = build();
    expect(first).toEqual(second);
  });

  test("validates empty root text", () => {
    const model: MindmapDomainModel = {
      id: "test",
      title: "Test",
      root: { id: "root", text: "", children: [] },
    };
    const doc = compileMindmapDocument(model);
    expect(doc.diagnostics?.map((d) => d.code)).toContain("mindmap/empty-root");
  });

  test("warns on duplicate sibling names", () => {
    const doc = mindmap("Duplicates", (m) => {
      m.root("R").node("X").node("X");
    });
    expect(doc.diagnostics?.map((d) => d.code)).toContain("mindmap/no-duplicate-sibling");
  });

  test("renders a golden SVG via tree layout and renderer", async () => {
    const doc = mindmap("Golden", (m) => {
      m.root("Project")
        .node("Planning")
        .children((c) => {
          c.node("Scope").node("Timeline");
        })
        .node("Design")
        .children((c) => {
          c.node("UI").node("Architecture");
        })
        .node("Implementation")
        .children((c) => {
          c.node("Frontend").node("Backend").node("Testing");
        });
    });

    const layout = treeLayout();
    const positionedDiagram = await layout.layout(doc, { direction: "LR" });
    const svg = await renderSvg(doc, { positionedDiagram });

    expect(svg).toContain("Project");
    expect(svg).toContain("<svg");

    await expectGolden("mindmap", svg);
  });

  test("mapShape returns defaults for undefined shape", () => {
    expect(mapShape(undefined)).toEqual({ type: "rounded-rect", radius: 12 });
    expect(mapShape("rounded")).toEqual({ type: "rounded-rect", radius: 12 });
  });

  test("lightenColor blends toward white", () => {
    expect(lightenColor("#000000", 0)).toBe("#000000");
    expect(lightenColor("#000000", 1)).toBe("#ffffff");
    expect(lightenColor("#ff0000", 0.5)).toBe("#ff8080");
  });

  test("builder throws when no root defined", () => {
    const builder = new MindmapBuilder("No Root");
    expect(() => builder.toModel()).toThrow("Mindmap must have a root node");
  });

  test("deeply nested nodes carry branch color from top-level ancestor", () => {
    const doc = mindmap("Deep", (m) => {
      m.root("R")
        .node("A")
        .children((c) => {
          c.node("A1").children((c2) => {
            c2.node("A1a");
          });
        })
        .node("B");
    });

    const nodeA1a = doc.nodes.find((n) => n.label === "A1a");
    expect(nodeA1a?.metadata?.branchColor).toBe(BRANCH_COLORS[0]);

    const nodeB = doc.nodes.find((n) => n.label === "B");
    expect(nodeB?.metadata?.branchColor).toBe(BRANCH_COLORS[1]);
  });
});
