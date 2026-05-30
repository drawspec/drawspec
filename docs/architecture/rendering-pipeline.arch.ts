import {
  container,
  database,
  person,
  softwareSystem,
  workspace,
} from "../../packages/architecture/src";

export default workspace("DrawSpec rendering pipeline", (ws) => {
  const drawspec = ws.model.add(
    softwareSystem("DrawSpec", {
      description:
        "TypeScript-native diagram-as-code platform with a deterministic compile-validate-layout-render pipeline",
    }),
  );

  const author = drawspec.add(
    container("Author", {
      description:
        "Source files written by developers: .diagram.ts, .arch.ts, and .sequence.ts TypeScript modules",
      technology: "TypeScript",
    }),
  );

  const compile = drawspec.add(
    container("Compile", {
      description:
        "Imports TypeScript modules and produces DiagramDocument IR, including C4 workspace compilation",
      technology: "Bun import / TypeScript",
    }),
  );

  const validate = drawspec.add(
    container("Validate", {
      description:
        "Runs the rule engine against compiled IR, checking structure, style, and architectural constraints",
      technology: "TypeScript",
    }),
  );

  const layoutEngine = drawspec.add(
    container("Layout", {
      description:
        "Computes deterministic x/y positions for all diagram elements using graph or sequence layout algorithms",
      technology: "dagre / ELK / WASM",
    }),
  );

  const render = drawspec.add(
    container("Render", {
      description:
        "Generates pixel-perfect deterministic SVG from the positioned diagram, ensuring reproducible output",
      technology: "TypeScript / SVG",
    }),
  );

  const output = drawspec.add(
    container("Output", {
      description:
        "Final artifacts: SVG files, HTML preview site, and optional export formats (Mermaid, PlantUML, D2)",
      technology: "Filesystem / HTTP",
    }),
  );

  const cache = drawspec.add(
    database("Cache", {
      description:
        "Persistent store that deduplicates rendering by caching SVG output keyed on serialized IR and configuration",
      technology: "SQLite / Filesystem",
    }),
  );

  const cli = drawspec.add(
    container("CLI Orchestrator", {
      description:
        "Coordinates the pipeline stages, handling file discovery, parallel compilation, and output writing",
      technology: "Bun",
    }),
  );

  const developer = ws.model.add(
    person("Developer", {
      description:
        "Engineer who writes diagram source files and invokes the CLI to check and render output",
    }),
  );

  // Pipeline data flow
  author.uses(compile, "TypeScript modules imported by", {
    technology: "Bun import",
  });
  compile.uses(validate, "Emits IR for validation", {
    technology: "DiagramDocument",
  });
  validate.uses(layoutEngine, "Passes valid IR to", {
    technology: "DiagramDocument",
  });
  layoutEngine.uses(render, "Feeds positioned diagram to", {
    technology: "PositionedDiagram",
  });
  render.uses(output, "Writes SVG and site files", {
    technology: "Filesystem",
  });

  // Cache integration
  compile.uses(cache, "Checks cache for existing render", {
    technology: "CacheStore",
  });
  render.uses(cache, "Stores rendered SVG for reuse", {
    technology: "CacheStore",
  });

  // CLI orchestrates the entire pipeline
  cli.uses(author, "Discovers source files", { technology: "Glob" });
  cli.uses(compile, "Triggers compilation", { technology: "TypeScript" });
  cli.uses(validate, "Runs rule checks", { technology: "TypeScript" });
  cli.uses(layoutEngine, "Computes positions", { technology: "TypeScript" });
  cli.uses(render, "Produces output", { technology: "TypeScript" });
  cli.uses(output, "Writes files", { technology: "Filesystem" });

  // External actor
  developer.uses(cli, "Invokes check, render, serve", {
    technology: "Terminal",
  });

  ws.views.container(drawspec, "rendering-pipeline", (view) =>
    view
      .include(
        author,
        compile,
        validate,
        layoutEngine,
        render,
        output,
        cache,
        cli,
        developer,
      )
      .autoLayout("left-right"),
  );
});
