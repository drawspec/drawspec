import { dirname, resolve } from "node:path";
import type { DefinitionLink, Position } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import { FACTORY_FUNCTIONS, PACKAGES } from "./completion";

/**
 * Provide go-to-definition for diagram constructs.
 */
export function provideDefinition(
  documentUri: string,
  documentText: string,
  position: Position,
  rootPath?: string
): DefinitionLink[] {
  const lines = documentText.split("\n");
  const line = lines[position.line] ?? "";
  const word = wordAtPosition(line, position);

  if (word === undefined) return [];

  // 1. Import path definition — Ctrl+Click on "@drawspec/..." in import
  const importDefs = resolveImportDefinition(line, position, word, rootPath);
  if (importDefs.length > 0) return importDefs;

  // 2. @diagram reference — in doc comments like @diagram ./file.ts
  const diagramDefs = resolveDiagramReference(line, position, documentUri, rootPath);
  if (diagramDefs.length > 0) return diagramDefs;

  // 3. Factory function — jump to package entry
  const factoryDefs = resolveFactoryDefinition(documentText, word, rootPath);
  if (factoryDefs.length > 0) return factoryDefs;

  // 4. Builder method — jump to the type definition
  const builderDefs = resolveBuilderTypeDefinition(documentText, word, position, rootPath);
  if (builderDefs.length > 0) return builderDefs;

  return [];
}

/**
 * Find the word at a given position in a line.
 */
function wordAtPosition(line: string, position: Position): string | undefined {
  const char = position.character;
  if (char < 0 || char > line.length) return undefined;

  let start = char;
  let end = char;

  while (start > 0 && /\w/.test(line[start - 1] ?? "")) {
    start -= 1;
  }

  while (end < line.length && /\w/.test(line[end] ?? "")) {
    end += 1;
  }

  if (start === end) return undefined;
  return line.slice(start, end);
}

/**
 * Resolve import statements like `from "@drawspec/uml-sequence"` to the package entry point.
 */
function resolveImportDefinition(
  line: string,
  position: Position,
  _word: string,
  rootPath?: string
): DefinitionLink[] {
  // Match: from "@drawspec/package-name" or import ... from "@drawspec/package-name"
  const importMatch = line.match(/(?:from|import)\s+.*["'](@drawspec\/([^"']*))["']/);
  if (!importMatch) return [];

  // Check if the cursor is within the import string
  const fullImport = importMatch[1];
  const importStart = line.indexOf(fullImport);
  const importEnd = importStart + fullImport.length;

  if (position.character < importStart || position.character > importEnd) return [];

  const pkg = PACKAGES.find(
    (p) => p.fullName === fullImport || p.shortName === fullImport.replace("@drawspec/", "")
  );
  if (pkg === undefined) return [];

  const targetPath = resolvePackageEntryPath(pkg, rootPath);
  if (targetPath === undefined) return [];

  const targetUri = URI.file(targetPath).toString();

  return [
    {
      targetUri,
      targetRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
      targetSelectionRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    },
  ];
}

/**
 * Resolve `@diagram ./file.ts` references in doc comments.
 */
function resolveDiagramReference(
  line: string,
  position: Position,
  documentUri: string,
  _rootPath?: string
): DefinitionLink[] {
  // Match: @diagram ./path or @diagram path/to/file.ts
  const diagramMatch = line.match(/@diagram\s+(\S+)/);
  if (!diagramMatch) return [];

  const refPath = diagramMatch[1];
  const matchStart = line.indexOf("@diagram") + "@diagram ".length;
  const matchEnd = matchStart + refPath.length;

  if (position.character < matchStart || position.character > matchEnd) return [];

  const sourcePath = URI.parse(documentUri).fsPath;
  const sourceDir = dirname(sourcePath);
  const targetPath = resolve(sourceDir, refPath);

  return [
    {
      targetUri: URI.file(targetPath).toString(),
      targetRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
      targetSelectionRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    },
  ];
}

/**
 * Resolve factory function calls to their package entry point.
 */
function resolveFactoryDefinition(
  documentText: string,
  word: string,
  rootPath?: string
): DefinitionLink[] {
  // Check if the word matches any factory function
  let pkg = FACTORY_FUNCTIONS.get(word);

  // Also check if word is an alias from an import
  if (pkg === undefined) {
    const lines = documentText.split("\n");
    for (const line of lines) {
      const match = line.match(/import\s*\{([^}]+)\}\s*from\s*["'](@drawspec\/[^"']+)["']/);
      if (match) {
        const imports = match[1];
        const _pkgName = match[2];
        const bindings = imports.split(",").map((s) => s.trim());
        for (const binding of bindings) {
          const parts = binding.split(/\s+as\s+/);
          const original = parts[0]?.trim();
          const alias = parts[1]?.trim() ?? original;
          if ((alias === word || original === word) && original !== undefined) {
            const found = FACTORY_FUNCTIONS.get(original);
            if (found !== undefined) {
              pkg = found;
              break;
            }
          }
        }
      }
    }
  }

  if (pkg === undefined) return [];

  const targetPath = resolvePackageEntryPath(pkg, rootPath);
  if (targetPath === undefined) return [];

  return [
    {
      targetUri: URI.file(targetPath).toString(),
      targetRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
      targetSelectionRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    },
  ];
}

/**
 * Resolve builder method names to their type definition file.
 */
function resolveBuilderTypeDefinition(
  documentText: string,
  word: string,
  _position: Position,
  rootPath?: string
): DefinitionLink[] {
  // Find which package's builder we're in by checking imports
  const lines = documentText.split("\n");
  const importedPackages = new Map<string, { pkg: (typeof PACKAGES)[number]; alias: string }>();

  for (const line of lines) {
    const match = line.match(/import\s*\{([^}]+)\}\s*from\s*["'](@drawspec\/[^"']+)["']/);
    if (match) {
      const imports = match[1];
      const pkgName = match[2];
      const pkg = PACKAGES.find((p) => p.fullName === pkgName);
      if (pkg !== undefined) {
        const bindings = imports.split(",").map((s) => s.trim());
        for (const binding of bindings) {
          const parts = binding.split(/\s+as\s+/);
          const original = parts[0]?.trim();
          const alias = parts[1]?.trim() ?? original;
          if (original === pkg.factoryFunction && alias !== undefined) {
            importedPackages.set(alias, { pkg, alias });
          }
        }
      }
    }
  }

  // Check if the word matches a builder method of any imported package
  for (const { pkg } of importedPackages.values()) {
    const method = pkg.builderMethods.find((m) => m.name === word);
    if (method !== undefined) {
      const typesPath = resolvePackageTypesPath(pkg, rootPath);
      if (typesPath !== undefined) {
        return [
          {
            targetUri: URI.file(typesPath).toString(),
            targetRange: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            targetSelectionRange: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
          },
        ];
      }
    }
  }

  return [];
}

/**
 * Resolve a package to its entry point source file path.
 */
function resolvePackageEntryPath(pkg: PackageInfo, rootPath?: string): string | undefined {
  const base = rootPath ?? process.cwd();
  // In the monorepo, packages are at packages/<shortName>/src/index.ts
  const candidate = resolve(base, "packages", pkg.shortName, "src", "index.ts");
  return candidate;
}

/**
 * Resolve a package to its types file path.
 */
function resolvePackageTypesPath(pkg: PackageInfo, rootPath?: string): string | undefined {
  const base = rootPath ?? process.cwd();
  // Most packages have types in src/types.ts
  const candidate = resolve(base, "packages", pkg.shortName, "src", "types.ts");
  return candidate;
}

// Re-import PackageInfo type for local use
import type { PackageInfo } from "./completion";
