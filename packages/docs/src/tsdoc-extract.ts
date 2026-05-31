import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import * as ts from "typescript";
import type { DocBlock, DocDefinition, DocInline, HeadingLevel, TableNode } from "./types";

export type ApiSymbolKind = "function" | "class" | "interface" | "type" | "constant";

export interface ApiParameter {
  name: string;
  type?: string;
  description: string;
}

export interface ApiMember {
  name: string;
  kind: "method" | "property";
  type?: string;
  description: string;
}

export interface TsDocInfo {
  summary: string;
  remarks: string[];
  params: ApiParameter[];
  returns?: string;
  examples: string[];
  deprecated?: string;
  see: string[];
}

export interface ApiSymbol {
  name: string;
  kind: ApiSymbolKind;
  source: string;
  line: number;
  signature?: string;
  type?: string;
  tsdoc: TsDocInfo;
  members: ApiMember[];
}

export interface ApiPackage {
  name: string;
  description?: string;
  packageDir: string;
  symbols: ApiSymbol[];
  groups: Record<ApiSymbolKind, ApiSymbol[]>;
}

interface PackageJson {
  name?: string;
  description?: string;
}

interface BarrelExport {
  name: string;
  exportedName: string;
  sourceFile: string;
}

interface DeclarationInfo {
  name: string;
  kind: ApiSymbolKind;
  node: ts.Node;
  members: ApiMember[];
  signature?: string;
  type?: string;
}

const EMPTY_TSDOC: TsDocInfo = {
  summary: "",
  remarks: [],
  params: [],
  examples: [],
  see: [],
};

/** Extracts public API documentation for a package from its `src/index.ts` barrel. */
export async function extractPackageApi(packageDir: string): Promise<ApiPackage> {
  const packageJson = await readPackageJson(packageDir);
  const packageName = packageJson.name ?? basename(packageDir);
  const indexPath = join(packageDir, "src", "index.ts");
  const barrelExports = await collectBarrelExports(indexPath);
  const bySource = groupBySource(barrelExports);
  const symbols: ApiSymbol[] = [];

  for (const [sourceFile, exports] of [...bySource.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const source = await readFile(sourceFile, "utf8");
    const parsed = ts.createSourceFile(
      sourceFile,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const declarations = collectDeclarations(parsed, source);
    for (const item of exports.sort((left, right) =>
      left.exportedName.localeCompare(right.exportedName)
    )) {
      const declaration = declarations.get(item.name);
      if (!declaration) continue;
      symbols.push(toApiSymbol(item.exportedName, declaration, parsed, source, sourceFile));
    }
  }

  const sortedSymbols = dedupeSymbols(symbols).sort((left, right) => {
    const kindOrder = kindRank(left.kind) - kindRank(right.kind);
    return kindOrder === 0 ? left.name.localeCompare(right.name) : kindOrder;
  });

  return {
    name: packageName,
    ...(packageJson.description !== undefined ? { description: packageJson.description } : {}),
    packageDir,
    symbols: sortedSymbols,
    groups: groupSymbols(sortedSymbols),
  };
}

/** Converts extracted TSDoc metadata into DrawSpec DocBlock IR nodes. */
export function tsDocToDocBlocks(tsdoc: TsDocInfo): DocBlock[] {
  const blocks: DocBlock[] = [];
  blocks.push(...paragraphsFromText(tsdoc.summary));

  for (const remark of tsdoc.remarks) {
    blocks.push(...paragraphsFromText(remark));
  }

  if (tsdoc.deprecated !== undefined) {
    blocks.push({
      type: "callout",
      kind: "warning",
      title: "Deprecated",
      children: textInline(tsdoc.deprecated),
    });
  }

  if (tsdoc.params.length > 0) {
    blocks.push(parametersTable(tsdoc.params));
  }

  if (tsdoc.returns !== undefined && tsdoc.returns.trim().length > 0) {
    blocks.push({
      type: "paragraph",
      children: [
        { type: "bold", children: [{ type: "text", value: "Returns:" }] },
        { type: "text", value: ` ${normalizeText(tsdoc.returns)}` },
      ],
    });
  }

  for (const example of tsdoc.examples) {
    blocks.push({ type: "codeBlock", lang: "ts", value: stripCodeFence(example) });
  }

  if (tsdoc.see.length > 0) {
    const children: DocInline[] = [
      { type: "bold", children: [{ type: "text", value: "See also:" }] },
    ];
    tsdoc.see.forEach((target, index) => {
      children.push({ type: "text", value: index === 0 ? " " : ", " });
      children.push(seeInline(target));
    });
    blocks.push({ type: "paragraph", children });
  }

  return blocks;
}

/** Generates a structured API reference page for a package. */
export function generateApiPage(packageName: string, api: ApiPackage): DocDefinition {
  const content: DocBlock[] = [heading(1, packageName)];
  const description =
    api.description ?? firstSummary(api.symbols) ?? `API reference for ${packageName}.`;
  content.push({ type: "paragraph", children: textInline(description) });

  appendSection(content, "Functions", api.groups.function, appendCallableSymbol);
  appendSection(content, "Classes", api.groups.class, appendObjectSymbol);
  appendSection(content, "Interfaces", api.groups.interface, appendObjectSymbol);
  appendSection(content, "Types", api.groups.type, appendSimpleSymbol);
  appendSection(content, "Constants", api.groups.constant, appendSimpleSymbol);

  return {
    title: packageName,
    description,
    content,
    metadata: {
      api: true,
      packageName,
      symbolCount: api.symbols.length,
    },
  };
}

async function readPackageJson(packageDir: string): Promise<PackageJson> {
  const raw = await readFile(join(packageDir, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as PackageJson;
  return parsed;
}

async function collectBarrelExports(indexPath: string): Promise<BarrelExport[]> {
  const source = await readFile(indexPath, "utf8");
  const sourceFile = ts.createSourceFile(
    indexPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const exports: BarrelExport[] = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const sourcePath = await resolveModulePath(
        dirname(indexPath),
        statement.moduleSpecifier.text
      );
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const specifier of statement.exportClause.elements) {
          const name = specifier.propertyName?.text ?? specifier.name.text;
          exports.push({ name, exportedName: specifier.name.text, sourceFile: sourcePath });
        }
      } else if (!statement.exportClause) {
        const moduleExports = await collectModuleExportNames(sourcePath);
        for (const name of moduleExports) {
          exports.push({ name, exportedName: name, sourceFile: sourcePath });
        }
      }
    }

    if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        const name = specifier.propertyName?.text ?? specifier.name.text;
        exports.push({ name, exportedName: specifier.name.text, sourceFile: indexPath });
      }
    }
  }

  for (const name of collectDeclarations(sourceFile, source).keys()) {
    exports.push({ name, exportedName: name, sourceFile: indexPath });
  }

  return exports;
}

async function collectModuleExportNames(sourceFile: string): Promise<string[]> {
  const source = await readFile(sourceFile, "utf8");
  const parsed = ts.createSourceFile(
    sourceFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  return [...collectDeclarations(parsed, source).keys()].sort();
}

async function resolveModulePath(baseDir: string, specifier: string): Promise<string> {
  const base = resolve(baseDir, specifier);
  const candidates = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  for (const candidate of candidates) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }
  throw new Error(`Unable to resolve barrel export ${specifier} from ${baseDir}`);
}

function collectDeclarations(
  sourceFile: ts.SourceFile,
  source: string
): Map<string, DeclarationInfo> {
  const declarations = new Map<string, DeclarationInfo>();
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
      declarations.set(statement.name.text, {
        name: statement.name.text,
        kind: "function",
        node: statement,
        members: [],
        signature: functionSignature(statement, sourceFile),
      });
    } else if (ts.isClassDeclaration(statement) && statement.name && isExported(statement)) {
      declarations.set(statement.name.text, {
        name: statement.name.text,
        kind: "class",
        node: statement,
        members: classMembers(statement, sourceFile, source),
        signature: classSignature(statement, sourceFile),
      });
    } else if (ts.isInterfaceDeclaration(statement) && isExported(statement)) {
      declarations.set(statement.name.text, {
        name: statement.name.text,
        kind: "interface",
        node: statement,
        members: interfaceMembers(statement, sourceFile, source),
        signature: `interface ${statement.name.text}`,
      });
    } else if (ts.isTypeAliasDeclaration(statement) && isExported(statement)) {
      declarations.set(statement.name.text, {
        name: statement.name.text,
        kind: "type",
        node: statement,
        members: [],
        signature: `type ${statement.name.text} = ${statement.type.getText(sourceFile)}`,
        type: statement.type.getText(sourceFile),
      });
    } else if (ts.isEnumDeclaration(statement) && isExported(statement)) {
      declarations.set(statement.name.text, {
        name: statement.name.text,
        kind: "constant",
        node: statement,
        members: [],
        signature: `enum ${statement.name.text}`,
        type: "enum",
      });
    } else if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const info: DeclarationInfo = {
            name: declaration.name.text,
            kind: "constant",
            node: statement,
            members: [],
          };
          const declarationType =
            declaration.type?.getText(sourceFile) ??
            inferredInitializerType(declaration, sourceFile);
          if (declarationType !== undefined) info.type = declarationType;
          info.signature = constantSignature(declaration.name.text, declarationType);
          declarations.set(declaration.name.text, info);
        }
      }
    }
  }
  return declarations;
}

function toApiSymbol(
  exportedName: string,
  declaration: DeclarationInfo,
  sourceFile: ts.SourceFile,
  source: string,
  filePath: string
): ApiSymbol {
  const tsdoc = mergeParameterTypes(
    parseComment(getLeadingTsDoc(declaration.node, source)),
    declaration
  );
  return {
    name: exportedName,
    kind: declaration.kind,
    source: filePath,
    line: sourceFile.getLineAndCharacterOfPosition(declaration.node.getStart(sourceFile)).line + 1,
    ...(declaration.signature !== undefined ? { signature: declaration.signature } : {}),
    ...(declaration.type !== undefined ? { type: declaration.type } : {}),
    tsdoc,
    members: declaration.members,
  };
}

function mergeParameterTypes(tsdoc: TsDocInfo, declaration: DeclarationInfo): TsDocInfo {
  if (!ts.isFunctionDeclaration(declaration.node)) return tsdoc;
  const params = declaration.node.parameters.map((param) => {
    const name = param.name.getText();
    const documented = tsdoc.params.find((item) => item.name === name);
    return {
      name,
      ...(param.type !== undefined ? { type: param.type.getText() } : {}),
      description: documented?.description ?? "",
    };
  });
  return { ...tsdoc, params };
}

function parseComment(raw: string | undefined): TsDocInfo {
  if (raw === undefined) return { ...EMPTY_TSDOC, remarks: [], params: [], examples: [], see: [] };
  const lines = stripComment(raw);
  const summaryLines: string[] = [];
  const tags = new Map<string, string[]>();
  let currentTag: string | undefined;

  for (const line of lines) {
    const tagMatch = line.match(/^@(\w+)\b\s*(.*)$/);
    if (tagMatch) {
      currentTag = tagMatch[1];
      if (currentTag === undefined) continue;
      appendTag(tags, currentTag, tagMatch[2] ?? "", true);
    } else if (currentTag !== undefined) {
      appendTag(tags, currentTag, line, false);
    } else {
      summaryLines.push(line);
    }
  }

  return {
    summary: cleanBlock(summaryLines.join("\n")),
    remarks: (tags.get("remarks") ?? []).map(cleanBlock).filter(Boolean),
    params: parseParamTags(tags.get("param") ?? []),
    examples: (tags.get("example") ?? []).map(cleanBlock).filter(Boolean),
    see: (tags.get("see") ?? []).map(cleanBlock).filter(Boolean),
    ...optionalString("returns", firstClean(tags, "returns") ?? firstClean(tags, "return")),
    ...optionalString("deprecated", firstClean(tags, "deprecated")),
  };
}

function optionalString<Key extends "returns" | "deprecated">(
  key: Key,
  value: string | undefined
): Pick<TsDocInfo, Key> | Record<string, never> {
  return value === undefined ? {} : ({ [key]: value } as Pick<TsDocInfo, Key>);
}

function stripComment(raw: string): string[] {
  return raw
    .replace(/^\s*\/\*\*/, "")
    .replace(/\*\/\s*$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").trimEnd());
}

function appendTag(
  tags: Map<string, string[]>,
  tag: string,
  line: string,
  startNew: boolean
): void {
  const existing = tags.get(tag) ?? [];
  if (startNew || existing.length === 0) {
    existing.push(line);
  } else {
    const last = existing[existing.length - 1] ?? "";
    existing[existing.length - 1] = `${last}\n${line}`;
  }
  tags.set(tag, existing);
}

function parseParamTags(tags: string[]): ApiParameter[] {
  return tags.map((tag) => {
    const match = tag.trim().match(/^([\w$.-]+)\s*-?\s*(.*)$/s);
    if (!match) return { name: tag.trim(), description: "" };
    return { name: match[1] ?? "", description: cleanBlock(match[2] ?? "") };
  });
}

function firstClean(tags: Map<string, string[]>, tag: string): string | undefined {
  const value = tags.get(tag)?.[0];
  const cleaned = value === undefined ? undefined : cleanBlock(value);
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

function getLeadingTsDoc(node: ts.Node, source: string): string | undefined {
  const ranges = ts.getLeadingCommentRanges(source, node.getFullStart());
  const lastRange = ranges?.at(-1);
  if (!lastRange) return undefined;
  const comment = source.slice(lastRange.pos, lastRange.end);
  return comment.startsWith("/**") ? comment : undefined;
}

function isExported(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) ?? false)
  );
}

function functionSignature(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): string {
  const name = node.name?.text ?? "function";
  const params = node.parameters.map((param) => param.getText(sourceFile)).join(", ");
  const typeParams = node.typeParameters
    ? `<${node.typeParameters.map((item) => item.getText(sourceFile)).join(", ")}>`
    : "";
  const returns = node.type ? `: ${node.type.getText(sourceFile)}` : "";
  return `function ${name}${typeParams}(${params})${returns}`;
}

function classSignature(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): string {
  const heritage = node.heritageClauses?.map((clause) => clause.getText(sourceFile)).join(" ");
  return `class ${node.name?.text ?? "Anonymous"}${heritage ? ` ${heritage}` : ""}`;
}

function classMembers(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  source: string
): ApiMember[] {
  return node.members.flatMap((member) => memberInfo(member, sourceFile, source));
}

function interfaceMembers(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  source: string
): ApiMember[] {
  return node.members.flatMap((member) => memberInfo(member, sourceFile, source));
}

function memberInfo(
  member: ts.ClassElement | ts.TypeElement,
  sourceFile: ts.SourceFile,
  source: string
): ApiMember[] {
  const name = member.name?.getText(sourceFile);
  if (!name) return [];
  const comment = parseComment(getLeadingTsDoc(member, source));
  if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
    const params = member.parameters.map((param) => param.getText(sourceFile)).join(", ");
    const returns = member.type ? `: ${member.type.getText(sourceFile)}` : "";
    return [{ name, kind: "method", type: `(${params})${returns}`, description: comment.summary }];
  }
  if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
    return [
      {
        name,
        kind: "property",
        ...(member.type ? { type: member.type.getText(sourceFile) } : {}),
        description: comment.summary,
      },
    ];
  }
  return [];
}

function inferredInitializerType(
  declaration: ts.VariableDeclaration,
  sourceFile: ts.SourceFile
): string | undefined {
  if (!declaration.initializer) return undefined;
  if (ts.isStringLiteral(declaration.initializer)) return "string";
  if (ts.isNumericLiteral(declaration.initializer)) return "number";
  if (
    declaration.initializer.kind === ts.SyntaxKind.TrueKeyword ||
    declaration.initializer.kind === ts.SyntaxKind.FalseKeyword
  )
    return "boolean";
  return declaration.initializer.getText(sourceFile).split("\n")[0];
}

function groupBySource(exports: BarrelExport[]): Map<string, BarrelExport[]> {
  const grouped = new Map<string, BarrelExport[]>();
  for (const item of exports) {
    const existing = grouped.get(item.sourceFile) ?? [];
    existing.push(item);
    grouped.set(item.sourceFile, existing);
  }
  return grouped;
}

function dedupeSymbols(symbols: ApiSymbol[]): ApiSymbol[] {
  const seen = new Set<string>();
  const result: ApiSymbol[] = [];
  for (const symbol of symbols) {
    const key = `${symbol.kind}:${symbol.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(symbol);
  }
  return result;
}

function groupSymbols(symbols: ApiSymbol[]): Record<ApiSymbolKind, ApiSymbol[]> {
  return {
    function: symbols.filter((symbol) => symbol.kind === "function"),
    class: symbols.filter((symbol) => symbol.kind === "class"),
    interface: symbols.filter((symbol) => symbol.kind === "interface"),
    type: symbols.filter((symbol) => symbol.kind === "type"),
    constant: symbols.filter((symbol) => symbol.kind === "constant"),
  };
}

function kindRank(kind: ApiSymbolKind): number {
  return ["function", "class", "interface", "type", "constant"].indexOf(kind);
}

function appendSection(
  content: DocBlock[],
  title: string,
  symbols: ApiSymbol[],
  appendSymbol: (content: DocBlock[], symbol: ApiSymbol) => void
): void {
  if (symbols.length === 0) return;
  content.push(heading(2, title));
  for (const symbol of symbols) appendSymbol(content, symbol);
}

function appendCallableSymbol(content: DocBlock[], symbol: ApiSymbol): void {
  content.push(heading(3, symbol.name));
  if (symbol.signature) content.push({ type: "codeBlock", lang: "ts", value: symbol.signature });
  content.push(...tsDocToDocBlocks(symbol.tsdoc));
}

function appendObjectSymbol(content: DocBlock[], symbol: ApiSymbol): void {
  content.push(heading(3, symbol.name));
  if (symbol.signature) content.push({ type: "codeBlock", lang: "ts", value: symbol.signature });
  content.push(...tsDocToDocBlocks(symbol.tsdoc));
  if (symbol.members.length > 0) content.push(membersTable(symbol.members));
}

function appendSimpleSymbol(content: DocBlock[], symbol: ApiSymbol): void {
  content.push(heading(3, symbol.name));
  if (symbol.signature) content.push({ type: "codeBlock", lang: "ts", value: symbol.signature });
  content.push(...tsDocToDocBlocks(symbol.tsdoc));
}

function constantSignature(name: string, type: string | undefined): string {
  return type === undefined ? `const ${name}` : `const ${name}: ${type}`;
}

function parametersTable(params: ApiParameter[]): TableNode {
  return table(
    ["Parameter", "Type", "Description"],
    params.map((param) => [code(param.name), text(param.type ?? "—"), text(param.description)])
  );
}

function membersTable(members: ApiMember[]): TableNode {
  return table(
    ["Member", "Kind", "Type", "Description"],
    members.map((member) => [
      code(member.name),
      text(member.kind),
      text(member.type ?? "—"),
      text(member.description),
    ])
  );
}

function table(headers: string[], rows: DocInline[][][]): TableNode {
  return {
    type: "table",
    children: [
      {
        type: "tableRow",
        children: headers.map((header) => ({ type: "tableCell", children: textInline(header) })),
      },
      ...rows.map((row) => ({
        type: "tableRow" as const,
        children: row.map((children) => ({ type: "tableCell" as const, children })),
      })),
    ],
  };
}

function paragraphsFromText(value: string): DocBlock[] {
  return splitParagraphs(value).map((paragraph) => ({
    type: "paragraph" as const,
    children: textInline(paragraph),
  }));
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/g)
    .map(normalizeText)
    .filter(Boolean);
}

function heading(level: HeadingLevel, value: string): DocBlock {
  return { type: "heading", level, id: slug(value), children: textInline(value) };
}

function textInline(value: string): DocInline[] {
  return [{ type: "text", value: normalizeText(value) }];
}

function text(value: string): DocInline[] {
  return textInline(value);
}

function code(value: string): DocInline[] {
  return [{ type: "codeInline", value }];
}

function seeInline(value: string): DocInline {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return { type: "link", href: trimmed, children: [{ type: "text", value: trimmed }] };
  }
  return { type: "text", value: trimmed };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanBlock(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/^\s*-\s*/, "")
    .trim();
}

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:ts|typescript)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function firstSummary(symbols: ApiSymbol[]): string | undefined {
  return symbols.map((symbol) => symbol.tsdoc.summary).find((summary) => summary.trim().length > 0);
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function discoverDrawSpecPackages(workspaceRoot: string): Promise<string[]> {
  const packagesDir = join(workspaceRoot, "packages");
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const packageDirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(packagesDir, entry.name);
    try {
      const packageJson = await readPackageJson(dir);
      await readFile(join(dir, "src", "index.ts"), "utf8");
      if (packageJson.name?.startsWith("@drawspec/")) packageDirs.push(dir);
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }
  return packageDirs.sort();
}
