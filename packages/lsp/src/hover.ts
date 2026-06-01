import type { Hover, Position } from "vscode-languageserver/node";
import {
  detectCompletionContext,
  FACTORY_FUNCTIONS,
  PACKAGES,
  type PackageInfo,
} from "./completion";

/**
 * Provide hover information for diagram constructs.
 */
export function provideHover(documentText: string, position: Position): Hover | undefined {
  const lines = documentText.split("\n");
  const line = lines[position.line] ?? "";
  const ctx = detectCompletionContext(documentText, position);

  // Find the word at the current position
  const word = wordAtPosition(line, position);
  if (word === undefined) return undefined;

  // Hover over a package import specifier
  if (ctx.inImport || isImportLine(line)) {
    const pkg = resolvePackageFromLine(line, word);
    if (pkg !== undefined) {
      return {
        contents: {
          kind: "markdown",
          value: formatPackageHover(pkg),
        },
      };
    }
  }

  // Hover over a factory function call
  const factoryPkg = FACTORY_FUNCTIONS.get(word);
  if (factoryPkg !== undefined) {
    return {
      contents: {
        kind: "markdown",
        value: formatFactoryHover(factoryPkg),
      },
    };
  }

  // Hover over a builder method
  if (ctx.inBuilderCallback && ctx.detectedPackage !== undefined) {
    const method = ctx.detectedPackage.builderMethods.find((m) => m.name === word);
    if (method !== undefined) {
      return {
        contents: {
          kind: "markdown",
          value: formatMethodHover(method, ctx.detectedPackage),
        },
      };
    }
  }

  // Hover over imported names
  const importedPackage = findImportedPackageForWord(documentText, word);
  if (importedPackage !== undefined) {
    return {
      contents: {
        kind: "markdown",
        value: formatPackageHover(importedPackage),
      },
    };
  }

  return undefined;
}

/**
 * Find the word at a given position in a line.
 */
function wordAtPosition(line: string, position: Position): string | undefined {
  const char = position.character;
  if (char < 0 || char > line.length) return undefined;

  let start = char;
  let end = char;

  // Expand left
  while (start > 0 && /\w/.test(line[start - 1] ?? "")) {
    start -= 1;
  }

  // Expand right
  while (end < line.length && /\w/.test(line[end] ?? "")) {
    end += 1;
  }

  if (start === end) return undefined;
  return line.slice(start, end);
}

/**
 * Check if a line is an import statement.
 */
function isImportLine(line: string): boolean {
  return /^\s*import\s/.test(line) || /^\s*from\s/.test(line);
}

/**
 * Try to resolve a package from the import line and the hovered word.
 */
function resolvePackageFromLine(line: string, word: string): PackageInfo | undefined {
  // Match the package specifier in the line
  const match = line.match(/from\s+["'](@drawspec\/[^"']+)["']/);
  if (match) {
    return PACKAGES.find((p) => p.fullName === match[1]);
  }

  // The word itself might be a package name
  if (word.startsWith("@drawspec/")) {
    return PACKAGES.find((p) => p.fullName === word);
  }

  return undefined;
}

/**
 * Find which package a word was imported from.
 */
function findImportedPackageForWord(documentText: string, word: string): PackageInfo | undefined {
  const lines = documentText.split("\n");
  for (const line of lines) {
    const match = line.match(/import\s*\{([^}]+)\}\s*from\s*["'](@drawspec\/[^"']+)["']/);
    if (match) {
      const imports = match[1];
      const pkgName = match[2];
      if (imports === undefined || pkgName === undefined) continue;
      const bindings = imports.split(",").map((s) => s.trim());
      for (const binding of bindings) {
        const parts = binding.split(/\s+as\s+/);
        const original = parts[0]?.trim();
        const alias = parts[1]?.trim() ?? original;
        if (original === word || alias === word) {
          return PACKAGES.find((p) => p.fullName === pkgName);
        }
      }
    }
  }
  return undefined;
}

/**
 * Format hover content for a package.
 */
function formatPackageHover(pkg: PackageInfo): string {
  const methods = pkg.builderMethods.map((m) => `  - \`${m.name}\`: ${m.documentation}`).join("\n");

  return [
    `**${pkg.fullName}**`,
    "",
    `Factory: \`${pkg.factoryFunction}()\``,
    `Diagram kind: \`${pkg.diagramKind}\``,
    "",
    "Builder methods:",
    methods,
  ].join("\n");
}

/**
 * Format hover content for a factory function.
 */
function formatFactoryHover(pkg: PackageInfo): string {
  return [
    `\`${pkg.factoryFunction}(title: string, callback?: ...) => ${pkg.diagramKind}Document\``,
    "",
    `Create a ${pkg.diagramKind} diagram using the ${pkg.fullName} package.`,
    "",
    "```ts",
    `import { ${pkg.factoryFunction} } from "${pkg.fullName}";`,
    "",
    `${pkg.factoryFunction}("My Diagram", (builder) => {`,
    "  // use builder methods here",
    "});",
    "```",
  ].join("\n");
}

/**
 * Format hover content for a builder method.
 */
function formatMethodHover(
  method: { name: string; signature: string; documentation: string },
  pkg: PackageInfo
): string {
  return [`\`${method.signature}\``, "", method.documentation, "", `_From ${pkg.fullName}_`].join(
    "\n"
  );
}
