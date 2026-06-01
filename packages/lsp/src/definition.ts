import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DefinitionLink, Position } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import { FACTORY_FUNCTIONS, PACKAGES, type PackageInfo } from "./completion";

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

  const importDefs = resolveImportDefinition(line, position, rootPath);
  if (importDefs.length > 0) return importDefs;

  const diagramDefs = resolveDiagramReference(line, position, documentUri);
  if (diagramDefs.length > 0) return diagramDefs;

  const factoryDefs = resolveFactoryDefinition(documentText, word, rootPath);
  if (factoryDefs.length > 0) return factoryDefs;

  const builderDefs = resolveBuilderTypeDefinition(documentText, word, rootPath);
  if (builderDefs.length > 0) return builderDefs;

  return [];
}

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

function resolveImportDefinition(
  line: string,
  position: Position,
  rootPath?: string
): DefinitionLink[] {
  const importRegex = /(?:from|import)\s+.*["'](@drawspec\/([^"']*))["']/g;
  for (const importMatch of line.matchAll(importRegex)) {
    const fullImport = importMatch[1];
    if (fullImport === undefined) continue;
    const matchStart = importMatch.index + importMatch[0].indexOf(fullImport);
    const matchEnd = matchStart + fullImport.length;

    if (position.character < matchStart || position.character > matchEnd) {
      continue;
    }

    const pkg = PACKAGES.find(
      (p) => p.fullName === fullImport || p.shortName === fullImport.replace("@drawspec/", "")
    );
    if (pkg === undefined) return [];

    const targetPath = resolvePackageEntryPath(pkg, rootPath);
    if (targetPath === undefined) return [];

    return [makeDefinitionLink(targetPath)];
  }
  return [];
}

function resolveDiagramReference(
  line: string,
  position: Position,
  documentUri: string
): DefinitionLink[] {
  const diagramRegex = /@diagram\s+(\S+)/g;
  for (const diagramMatch of line.matchAll(diagramRegex)) {
    const refPath = diagramMatch[1];
    if (refPath === undefined) continue;
    const atDiagramLiteral = "@diagram ";
    const matchStart = diagramMatch.index + atDiagramLiteral.length;
    const matchEnd = matchStart + refPath.length;

    if (position.character < matchStart || position.character > matchEnd) continue;

    const sourcePath = URI.parse(documentUri).fsPath;
    const sourceDir = dirname(sourcePath);
    const targetPath = resolve(sourceDir, refPath);

    return [makeDefinitionLink(targetPath)];
  }
  return [];
}

function resolveFactoryDefinition(
  documentText: string,
  word: string,
  rootPath?: string
): DefinitionLink[] {
  let pkg = FACTORY_FUNCTIONS.get(word);

  if (pkg === undefined) {
    const lines = documentText.split("\n");
    for (const line of lines) {
      const match = line.match(/import\s*\{([^}]+)\}\s*from\s*["'](@drawspec\/[^"']+)["']/);
      if (match) {
        const imports = match[1];
        if (imports === undefined) continue;
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

  return [makeDefinitionLink(targetPath)];
}

function resolveBuilderTypeDefinition(
  documentText: string,
  word: string,
  rootPath?: string
): DefinitionLink[] {
  const lines = documentText.split("\n");
  const importedPackages = new Map<string, { pkg: (typeof PACKAGES)[number]; alias: string }>();

  for (const line of lines) {
    const match = line.match(/import\s*\{([^}]+)\}\s*from\s*["'](@drawspec\/[^"']+)["']/);
    if (match) {
      const imports = match[1];
      const pkgName = match[2];
      if (imports === undefined || pkgName === undefined) continue;
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

  for (const { pkg } of importedPackages.values()) {
    const method = pkg.builderMethods.find((m) => m.name === word);
    if (method !== undefined) {
      const typesPath = resolvePackageTypesPath(pkg, rootPath);
      if (typesPath !== undefined) {
        return [makeDefinitionLink(typesPath)];
      }
    }
  }

  return [];
}

function resolvePackageEntryPath(pkg: PackageInfo, rootPath?: string): string | undefined {
  if (rootPath === undefined) return undefined;
  const candidate = resolve(rootPath, "packages", pkg.shortName, "src", "index.ts");
  return existsSync(candidate) ? candidate : undefined;
}

function resolvePackageTypesPath(pkg: PackageInfo, rootPath?: string): string | undefined {
  if (rootPath === undefined) return undefined;
  const candidate = resolve(rootPath, "packages", pkg.shortName, "src", "types.ts");
  return existsSync(candidate) ? candidate : undefined;
}

function makeDefinitionLink(targetPath: string): DefinitionLink {
  return {
    targetUri: URI.file(targetPath).toString(),
    targetRange: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    },
    targetSelectionRange: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    },
  };
}
