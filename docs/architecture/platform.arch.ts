import {
  container,
  person,
  softwareSystem,
  workspace,
} from "../../packages/architecture/src";

export default workspace("DrawSpec platform overview", (ws) => {
  const developer = ws.model.add(
    person("Developer", {
      description:
        "Software engineer authoring diagram files in TypeScript using DrawSpec DSLs",
    }),
  );

  const drawspec = ws.model.add(
    softwareSystem("DrawSpec", {
      description:
        "TypeScript-native diagram-as-code platform for authoring, validating, and rendering diagrams deterministically",
      technology: "TypeScript / Bun",
    }),
  );

  const core = drawspec.add(
    container("Core Engine", {
      description:
        "IR types, diagnostics, deterministic ID generation, compilation pipeline, and symbol registry",
      technology: "TypeScript",
    }),
  );

  const cli = drawspec.add(
    container("CLI", {
      description:
        "Command-line interface providing check, render, inspect, serve, watch, and build:site commands",
      technology: "Bun",
    }),
  );

  const lsp = drawspec.add(
    container("Language Server", {
      description:
        "LSP server providing real-time diagnostics and document symbols inside editors and IDEs",
      technology: "TypeScript",
    }),
  );

  const cicd = ws.model.add(
    softwareSystem("CI/CD Pipeline", {
      description:
        "Continuous integration system that validates diagrams and renders artifacts on every commit",
    }),
  );

  const editor = ws.model.add(
    softwareSystem("Editor / IDE", {
      description:
        "Code editor or IDE that connects to DrawSpec via the Language Server Protocol for live feedback",
    }),
  );

  developer.uses(drawspec, "Authors diagrams using", {
    technology: "TypeScript DSL",
  });
  developer.uses(cli, "Runs check and render", { technology: "CLI" });
  cicd.uses(drawspec, "Renders and validates via", {
    technology: "CLI / Node.js",
  });
  editor.uses(lsp, "Provides LSP integration via", { technology: "LSP" });
  lsp.uses(core, "Queries IR for diagnostics", { technology: "TypeScript" });
  cli.uses(core, "Compiles and renders via", { technology: "TypeScript" });

  ws.views.systemContext(drawspec, "platform-context", (view) =>
    view
      .include(developer, cicd, editor, core, cli, lsp)
      .autoLayout("left-right"),
  );
});
