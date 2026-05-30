import {
  container,
  database,
  softwareSystem,
  workspace,
} from "../../packages/architecture/src";

export default workspace("DrawSpec core packages", (ws) => {
  const drawspec = ws.model.add(
    softwareSystem("DrawSpec", {
      description:
        "TypeScript-native diagram-as-code platform composed of focused packages",
    }),
  );

  const core = drawspec.add(
    container("@drawspec/core", {
      description:
        "Diagram IR types, diagnostic model, deterministic ID generation, compilation pipeline, and symbol registry",
      technology: "TypeScript",
    }),
  );

  const architecture = drawspec.add(
    container("@drawspec/architecture", {
      description:
        "C4 architecture model authoring with person, softwareSystem, container, database elements and systemContext / container views",
      technology: "TypeScript",
    }),
  );

  const umlSequence = drawspec.add(
    container("@drawspec/uml-sequence", {
      description:
        "Sequence diagram DSL with participants, messages, fragments, and notes",
      technology: "TypeScript",
    }),
  );

  const umlClass = drawspec.add(
    container("@drawspec/uml-class", {
      description:
        "Class diagram DSL with classes, interfaces, inheritance, and composition",
      technology: "TypeScript",
    }),
  );

  const umlState = drawspec.add(
    container("@drawspec/uml-state", {
      description:
        "State machine diagram DSL with states, transitions, and composite states",
      technology: "TypeScript",
    }),
  );

  const umlComponent = drawspec.add(
    container("@drawspec/uml-component", {
      description:
        "Component diagram DSL with components, interfaces, and dependencies",
      technology: "TypeScript",
    }),
  );

  const umlDeployment = drawspec.add(
    container("@drawspec/uml-deployment", {
      description:
        "Deployment diagram DSL with nodes, artifacts, and communication paths",
      technology: "TypeScript",
    }),
  );

  const umlActivity = drawspec.add(
    container("@drawspec/uml-activity", {
      description:
        "Activity diagram DSL with actions, decisions, partitions, and control flow",
      technology: "TypeScript",
    }),
  );

  const validation = drawspec.add(
    container("@drawspec/validation", {
      description:
        "Rule engine with recommended policy and extensible architecture and diagram validation rules",
      technology: "TypeScript",
    }),
  );

  const layout = drawspec.add(
    container("@drawspec/layout", {
      description:
        "Layout engine interfaces, sequence layout, and adapters for dagre, ELK, and WASM backends",
      technology: "TypeScript",
    }),
  );

  const rendererSvg = drawspec.add(
    container("@drawspec/renderer-svg", {
      description:
        "Deterministic SVG renderer producing pixel-consistent output across runs and platforms",
      technology: "TypeScript / SVG",
    }),
  );

  const cli = drawspec.add(
    container("@drawspec/cli", {
      description:
        "CLI binary providing check, render, inspect, serve, watch, and build:site commands",
      technology: "Bun",
    }),
  );

  const viewer = drawspec.add(
    container("@drawspec/viewer", {
      description:
        "Framework-neutral web component for interactive diagram rendering in the browser",
      technology: "Web Components",
    }),
  );

  const cache = drawspec.add(
    database("@drawspec/cache", {
      description:
        "Persistent cache store with filesystem and SQLite backends for render output deduplication",
      technology: "SQLite / Filesystem",
    }),
  );

  const docs = drawspec.add(
    container("@drawspec/docs", {
      description:
        "Documentation engine with structured DocBlock nodes, freeform markdown, and API reference generation from TSDoc",
      technology: "TypeScript",
    }),
  );

  // DSL packages compile source into core IR
  architecture.uses(core, "Compiles C4 models to IR", {
    technology: "TypeScript",
  });
  umlSequence.uses(core, "Compiles sequence diagrams to IR", {
    technology: "TypeScript",
  });
  umlClass.uses(core, "Compiles class diagrams to IR", {
    technology: "TypeScript",
  });
  umlState.uses(core, "Compiles state diagrams to IR", {
    technology: "TypeScript",
  });
  umlComponent.uses(core, "Compiles component diagrams to IR", {
    technology: "TypeScript",
  });
  umlDeployment.uses(core, "Compiles deployment diagrams to IR", {
    technology: "TypeScript",
  });
  umlActivity.uses(core, "Compiles activity diagrams to IR", {
    technology: "TypeScript",
  });

  // Core feeds into validation, layout, and rendering
  core.uses(validation, "Validates IR against rules", {
    technology: "TypeScript",
  });
  core.uses(layout, "Positions diagram elements", {
    technology: "TypeScript",
  });
  layout.uses(rendererSvg, "Renders positioned diagram to SVG", {
    technology: "TypeScript",
  });

  // CLI orchestrates the pipeline
  cli.uses(architecture, "Loads .arch.ts workspaces", {
    technology: "Bun import",
  });
  cli.uses(core, "Runs compilation pipeline", { technology: "TypeScript" });
  cli.uses(validation, "Runs validation rules", { technology: "TypeScript" });
  cli.uses(layout, "Computes element positions", { technology: "TypeScript" });
  cli.uses(rendererSvg, "Generates SVG output", { technology: "TypeScript" });
  cli.uses(cache, "Caches rendered output", { technology: "SQLite" });
  cli.uses(viewer, "Serves preview web component", { technology: "HTTP" });

  // Documentation uses core types
  docs.uses(core, "Reads diagram IR for doc generation", {
    technology: "TypeScript",
  });

  ws.views.container(drawspec, "core-packages", (view) =>
    view
      .include(
        core,
        architecture,
        umlSequence,
        umlClass,
        umlState,
        umlComponent,
        umlDeployment,
        umlActivity,
        validation,
        layout,
        rendererSvg,
        cli,
        viewer,
        cache,
        docs,
      )
      .autoLayout("top-down"),
  );
});
