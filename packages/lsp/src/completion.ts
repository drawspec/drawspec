import {
  type CompletionItemKind as CIK,
  type CompletionItem,
  type CompletionList,
  InsertTextFormat,
  type Position,
} from "vscode-languageserver/node";

/**
 * Diagram package metadata used for completion, hover, and definition providers.
 */
export interface PackageInfo {
  /** The npm package name without scope prefix, e.g. "uml-sequence" */
  readonly shortName: string;
  /** Full scoped package name, e.g. "@drawspec/uml-sequence" */
  readonly fullName: string;
  /** The top-level factory function exported by the package, e.g. "sequence" */
  readonly factoryFunction: string;
  /** The diagram kind value produced by the factory */
  readonly diagramKind: string;
  /** Builder methods available inside the factory callback */
  readonly builderMethods: readonly BuilderMethodInfo[];
}

interface BuilderMethodInfo {
  readonly name: string;
  readonly signature: string;
  readonly documentation: string;
}

export const PACKAGES: readonly PackageInfo[] = [
  {
    shortName: "uml-sequence",
    fullName: "@drawspec/uml-sequence",
    factoryFunction: "sequence",
    diagramKind: "sequence",
    builderMethods: [
      {
        name: "actor",
        signature: "actor(name: string): SequenceActor",
        documentation: "Add an actor participant to the sequence diagram.",
      },
      {
        name: "participant",
        signature: "participant(name: string): SequenceParticipant",
        documentation: "Add a participant (non-actor) to the sequence diagram.",
      },
      {
        name: "alt",
        signature:
          "alt(condition: string, callback: (s: SequenceBuilder) => void): SequenceFragmentBuilder",
        documentation: "Start an alt fragment with the given condition.",
      },
    ],
  },
  {
    shortName: "uml-class",
    fullName: "@drawspec/uml-class",
    factoryFunction: "classDiagram",
    diagramKind: "class",
    builderMethods: [
      {
        name: "class_",
        signature: "class_(name: string, configure?: (c: ClassBuilder) => void): ClassElement",
        documentation:
          "Define a class with the given name. Optionally configure fields and methods.",
      },
      {
        name: "interface_",
        signature:
          "interface_(name: string, configure?: (i: InterfaceBuilder) => void): InterfaceElement",
        documentation: "Define an interface with the given name.",
      },
      {
        name: "enum_",
        signature: "enum_(name: string, configure?: (e: EnumBuilder) => void): EnumElement",
        documentation: "Define an enum with the given name.",
      },
      {
        name: "implements",
        signature: "implements(sourceName: string, targetName: string): ClassRelationship",
        documentation: "Create an implements relationship between two elements.",
      },
      {
        name: "uses",
        signature: "uses(sourceName: string, targetName: string): ClassRelationship",
        documentation: "Create a uses dependency between two elements.",
      },
    ],
  },
  {
    shortName: "uml-state",
    fullName: "@drawspec/uml-state",
    factoryFunction: "stateDiagram",
    diagramKind: "state",
    builderMethods: [
      {
        name: "state",
        signature:
          "state(name: string, configure?: (s: StateBuilder) => void): StateDiagramElement",
        documentation: "Define a state with the given name.",
      },
      {
        name: "initial",
        signature: "initial(name?: string): PseudostateElement",
        documentation: "Add an initial pseudostate.",
      },
      {
        name: "final",
        signature: "final(name?: string): PseudostateElement",
        documentation: "Add a final pseudostate.",
      },
    ],
  },
  {
    shortName: "uml-component",
    fullName: "@drawspec/uml-component",
    factoryFunction: "componentDiagram",
    diagramKind: "component",
    builderMethods: [
      {
        name: "component",
        signature:
          "component(name: string, configure?: (c: ComponentBuilder) => void): ComponentElement",
        documentation: "Define a component with the given name.",
      },
      {
        name: "dependency",
        signature:
          "dependency(sourceName: string, targetName: string, label?: string): DependencyEdge",
        documentation: "Create a dependency from source to target.",
      },
      {
        name: "add",
        signature: "add(element: ComponentDiagramElement): void",
        documentation: "Add a pre-built element to the diagram.",
      },
    ],
  },
  {
    shortName: "uml-deployment",
    fullName: "@drawspec/uml-deployment",
    factoryFunction: "deploymentDiagram",
    diagramKind: "deployment",
    builderMethods: [
      {
        name: "deploymentNode",
        signature:
          "deploymentNode(name: string, configure?: (n: DeploymentNodeBuilder) => void): string",
        documentation: "Define a deployment node.",
      },
      {
        name: "infrastructureNode",
        signature:
          "infrastructureNode(name: string, configure?: (n: InfrastructureNodeBuilder) => void): string",
        documentation: "Define an infrastructure node.",
      },
      {
        name: "communicationPath",
        signature:
          "communicationPath(source: string, target: string, options?: { protocol?: string }): void",
        documentation: "Define a communication path between nodes.",
      },
    ],
  },
  {
    shortName: "uml-activity",
    fullName: "@drawspec/uml-activity",
    factoryFunction: "activityDiagram",
    diagramKind: "activity",
    builderMethods: [
      {
        name: "action",
        signature:
          "action(label: string, define?: (a: ActionElement) => ActivityDefinition): ActionElement",
        documentation: "Define an action node.",
      },
      {
        name: "decision",
        signature:
          "decision(label: string, define?: (d: DecisionElement) => ActivityDefinition): DecisionElement",
        documentation: "Define a decision node.",
      },
      {
        name: "start",
        signature: "start(label?: string): ControlElement",
        documentation: "Add a start control node.",
      },
      {
        name: "end",
        signature: "end(label?: string): ControlElement",
        documentation: "Add an end control node.",
      },
    ],
  },
  {
    shortName: "architecture",
    fullName: "@drawspec/architecture",
    factoryFunction: "workspace",
    diagramKind: "architecture",
    builderMethods: [
      {
        name: "model",
        signature: "model: ArchitectureModel",
        documentation: "Access the architecture model to add elements and relationships.",
      },
      {
        name: "views",
        signature: "views: ArchitectureViews",
        documentation: "Access the views configuration for the workspace.",
      },
      {
        name: "styles",
        signature: "styles: ArchitectureStyles",
        documentation: "Access the styles configuration for the workspace.",
      },
    ],
  },
];

/**
 * Diagram kind to builder method suffix mapping.
 * Maps the `SequenceBuilder`, `ClassDiagramBuilderApi`, etc. types.
 */
export const FACTORY_FUNCTIONS = new Map<string, PackageInfo>(
  PACKAGES.map((pkg) => [pkg.factoryFunction, pkg])
);

// --- Context detection ---

export interface CompletionContext {
  /** True if cursor is inside an import statement */
  readonly inImport: boolean;
  /** True if typing a package specifier like `from "@drawspec/"` */
  readonly inPackageSpecifier: boolean;
  /** True if cursor is inside a builder callback */
  readonly inBuilderCallback: boolean;
  /** The diagram package if detected from imports */
  readonly detectedPackage: PackageInfo | undefined;
  /** True if typing a top-level expression (not inside callback or import) */
  readonly topLevel: boolean;
  /** Text of the current line up to the cursor */
  readonly linePrefix: string;
  /** The builder parameter name if inside a callback, e.g. "s" from `(s) =>` */
  readonly builderParamName: string | undefined;
}

export function detectCompletionContext(
  documentText: string,
  position: Position
): CompletionContext {
  const lines = documentText.split("\n");
  const line = lines[position.line] ?? "";
  const linePrefix = line.slice(0, position.character);

  // Check if we're inside an import statement
  const inImport = /^\s*import\s/.test(line) || /^\s*from\s/.test(line);
  const inPackageSpecifier =
    /from\s+["']@drawspec\//.test(linePrefix) || /import\s+.*["']@drawspec\//.test(linePrefix);

  // Collect all imported factory functions and their associated packages
  const importedPackages = new Map<string, PackageInfo>();
  const importedFactoryFunctions = new Map<string, { pkg: PackageInfo; alias: string }>();

  for (const docLine of lines) {
    // Match: import { sequence } from "@drawspec/uml-sequence"
    // or: import { sequence as seq } from "@drawspec/uml-sequence"
    const namedImportMatch = docLine.match(
      /import\s*\{([^}]+)\}\s*from\s*["'](@drawspec\/[^"']+)["']/
    );
    if (namedImportMatch) {
      const imports = namedImportMatch[1];
      const pkgName = namedImportMatch[2];
      if (imports === undefined || pkgName === undefined) continue;
      const pkg = PACKAGES.find((p) => p.fullName === pkgName);
      if (pkg !== undefined) {
        importedPackages.set(pkgName, pkg);
        const bindings = imports.split(",").map((s) => s.trim());
        for (const binding of bindings) {
          const parts = binding.split(/\s+as\s+/);
          const original = parts[0]?.trim();
          const alias = parts[1]?.trim() ?? original;
          if (original === pkg.factoryFunction && alias !== undefined) {
            importedFactoryFunctions.set(alias, { pkg, alias });
          }
        }
      }
    }
  }

  // Check if we're inside a builder callback by looking for the factory function call
  // pattern: factoryFunction("...", (param) => { or factoryFunction("...", ({ a, b }) =>
  let inBuilderCallback = false;
  let detectedPackage: PackageInfo | undefined;
  let builderParamName: string | undefined;

  // Look backward from current line to find enclosing callback
  let braceDepth = 0;
  for (let i = position.line; i >= 0; i--) {
    const currentLine = lines[i] ?? "";
    const startChar = i === position.line ? position.character : currentLine.length;

    for (let j = startChar - 1; j >= 0; j--) {
      const ch = currentLine[j];
      if (ch === "}") braceDepth += 1;
      if (ch === "{") {
        if (braceDepth === 0) {
          // Found opening brace — check if it's a factory callback
          const beforeBrace = currentLine.slice(0, j);
          // Match: factoryFunction("...", (param) =>
          const simpleCallbackMatch = beforeBrace.match(
            /(\w+)\s*\(\s*["'][^"']*["']\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*$/
          );
          if (simpleCallbackMatch) {
            const funcName = simpleCallbackMatch[1];
            const paramName = simpleCallbackMatch[2];
            if (funcName === undefined || paramName === undefined) continue;
            const fromImport = importedFactoryFunctions.get(funcName);
            const fromRegistry = FACTORY_FUNCTIONS.get(funcName);
            if (fromImport !== undefined) {
              inBuilderCallback = true;
              detectedPackage = fromImport.pkg;
              builderParamName = paramName;
            } else if (fromRegistry !== undefined) {
              inBuilderCallback = true;
              detectedPackage = fromRegistry;
              builderParamName = paramName;
            }
          }
          // Match: factoryFunction("...", ({ a, b }) =>  (destructured form)
          const destructuredMatch = beforeBrace.match(
            /(\w+)\s*\(\s*["'][^"']*["']\s*,\s*\(\s*\{([^}]+)\}\s*\)\s*=>\s*$/
          );
          if (destructuredMatch) {
            const funcName = destructuredMatch[1];
            const propsStr = destructuredMatch[2];
            if (funcName === undefined || propsStr === undefined) continue;
            const fromImport = importedFactoryFunctions.get(funcName);
            const fromRegistry = FACTORY_FUNCTIONS.get(funcName);
            const pkg = fromImport?.pkg ?? fromRegistry;
            if (pkg !== undefined) {
              inBuilderCallback = true;
              detectedPackage = pkg;
              // Track all destructured property names as potential builder method prefixes
              const propNames = propsStr
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              builderParamName = propNames[0];
            }
          }
        }
        braceDepth -= 1;
      }
    }
    if (braceDepth < 0) break;
  }

  // Check if we're typing a builder method like "s."
  const builderMethodMatch = linePrefix.match(/(\w+)\.\w*$/);
  if (builderMethodMatch && !inImport) {
    const objName = builderMethodMatch[1];
    // Check if this matches a builder parameter we detected
    if (builderParamName !== undefined && objName === builderParamName) {
      inBuilderCallback = true;
    }
  }

  // Top level = not in import and not in builder callback
  const topLevel = !inImport && !inBuilderCallback;

  return {
    inImport,
    inPackageSpecifier,
    inBuilderCallback,
    detectedPackage,
    topLevel,
    linePrefix,
    builderParamName,
  };
}

// --- Completion item builders ---

function packageCompletionItems(): CompletionItem[] {
  return PACKAGES.map((pkg, index) => ({
    label: pkg.fullName,
    kind: 9 as CIK, // CompletionItemKind.Module
    detail: `DrawSpec ${pkg.diagramKind} diagrams`,
    documentation: `Import ${pkg.factoryFunction} from this package to create ${pkg.diagramKind} diagrams.`,
    sortText: String(index).padStart(3, "0"),
  }));
}

function factoryCompletionItems(): CompletionItem[] {
  return PACKAGES.map((pkg) => ({
    label: pkg.factoryFunction,
    kind: 3 as CIK, // CompletionItemKind.Function
    detail: `${pkg.fullName}.${pkg.factoryFunction}`,
    documentation: `Create a ${pkg.diagramKind} diagram.\n\n\`${pkg.factoryFunction}(title: string, callback?: ...) => ${pkg.diagramKind}Document\``,
    insertText: `${pkg.factoryFunction}("\${1:title}", (\${2:s}) => {\n\t\${0}\n})`,
    insertTextFormat: InsertTextFormat.Snippet,
    sortText: `0_${pkg.factoryFunction}`,
  }));
}

function builderMethodCompletionItems(pkg: PackageInfo): CompletionItem[] {
  return pkg.builderMethods.map((method) => ({
    label: method.name,
    kind: 2 as CIK, // CompletionItemKind.Method
    detail: method.signature,
    documentation: method.documentation,
    insertText: `${method.name}($1)`,
    insertTextFormat: InsertTextFormat.Snippet,
    sortText: `1_${method.name}`,
  }));
}

// --- Main completion function ---

export function provideCompletions(documentText: string, position: Position): CompletionItem[] {
  const ctx = detectCompletionContext(documentText, position);

  // Inside a package import specifier
  if (ctx.inPackageSpecifier) {
    return packageCompletionItems();
  }

  // Inside a builder callback — suggest builder methods
  if (ctx.inBuilderCallback && ctx.detectedPackage !== undefined) {
    return builderMethodCompletionItems(ctx.detectedPackage);
  }

  // Top level — suggest factory functions
  if (ctx.topLevel) {
    const prefix = ctx.linePrefix.match(/(\w*)$/)?.[1] ?? "";
    if (prefix.length > 0 || ctx.linePrefix.endsWith(".")) {
      return factoryCompletionItems();
    }
  }

  return [];
}

/**
 * Convenience wrapper that returns a CompletionList.
 */
export function provideCompletionList(documentText: string, position: Position): CompletionList {
  return {
    isIncomplete: false,
    items: provideCompletions(documentText, position),
  };
}
