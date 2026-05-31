import type { DrawspecCommand } from "./types";

declare const process: { cwd(): string };
declare const Bun: {
  Glob: new (
    pattern: string
  ) => {
    scan(options: { cwd: string; absolute?: boolean; onlyFiles?: boolean }): AsyncIterable<string>;
  };
  file(path: string): { exists(): Promise<boolean>; json(): Promise<unknown> };
};

const commands = new Map<string, DrawspecCommand>();
const packageEntries = new Set<string>();

export function registerCommand(command: DrawspecCommand): void {
  registerName(command.name, command);
  for (const alias of command.aliases ?? []) {
    registerName(alias, command);
  }
}

export function getCommand(name: string): DrawspecCommand | undefined {
  return commands.get(name);
}

export function listCommands(): DrawspecCommand[] {
  return [...new Set(commands.values())];
}

export function listCommandNames(): string[] {
  return [...commands.keys()].sort(
    (left, right) => right.split(" ").length - left.split(" ").length
  );
}

export async function registerPackageCommands(workspaceRoot = process.cwd()): Promise<void> {
  for await (const packageJsonPath of new Bun.Glob("packages/*/package.json").scan({
    cwd: workspaceRoot,
    absolute: true,
    onlyFiles: true,
  })) {
    const manifest = await readManifest(packageJsonPath);
    if (manifest === undefined || manifest.name === "@drawspec/cli") continue;
    const entryPath = await resolvePackageEntry(packageJsonPath, manifest);
    if (entryPath === undefined) continue;
    await registerCommandsFromEntry(entryPath);
  }
}

function registerName(name: string, command: DrawspecCommand): void {
  const existing = commands.get(name);
  if (existing !== undefined && existing !== command) {
    throw new Error(`Command '${name}' is already registered`);
  }
  commands.set(name, command);
}

interface PackageManifest {
  name?: string;
  main?: string;
  exports?: unknown;
}

async function readManifest(path: string): Promise<PackageManifest | undefined> {
  const json = await Bun.file(path).json();
  if (!isRecord(json)) return undefined;
  return {
    ...(typeof json["name"] === "string" ? { name: json["name"] } : {}),
    ...(typeof json["main"] === "string" ? { main: json["main"] } : {}),
    ...(json["exports"] !== undefined ? { exports: json["exports"] } : {}),
  };
}

async function resolvePackageEntry(
  packageJsonPath: string,
  manifest: PackageManifest
): Promise<string | undefined> {
  const packageDir = packageJsonPath.slice(0, packageJsonPath.lastIndexOf("/"));
  const candidates = [entryFromExports(manifest.exports), manifest.main, "src/index.ts"].filter(
    (entry): entry is string => entry !== undefined
  );
  for (const candidate of candidates) {
    const path = joinPath(packageDir, candidate);
    if (await Bun.file(path).exists()) return path;
  }
  return undefined;
}

function entryFromExports(exportsField: unknown): string | undefined {
  if (typeof exportsField === "string") return exportsField;
  if (!isRecord(exportsField)) return undefined;
  const root = exportsField["."];
  if (typeof root === "string") return root;
  if (isRecord(root) && typeof root["import"] === "string") return root["import"];
  return undefined;
}

async function registerCommandsFromEntry(entryPath: string): Promise<void> {
  if (packageEntries.has(entryPath)) return;
  packageEntries.add(entryPath);
  try {
    const module = (await import(`${toFileUrl(entryPath)}?t=${Date.now()}`)) as Record<
      string,
      unknown
    >;
    const provider = module["drawspec"];
    if (!isRecord(provider) || !Array.isArray(provider["commands"])) return;
    for (const command of provider["commands"]) {
      if (isDrawspecCommand(command)) registerCommand(command);
    }
  } catch (error) {
    if (!(error instanceof Error)) return;
  }
}

function isDrawspecCommand(value: unknown): value is DrawspecCommand {
  return (
    isRecord(value) &&
    typeof value["name"] === "string" &&
    typeof value["description"] === "string" &&
    typeof value["run"] === "function"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function joinPath(...parts: string[]): string {
  const [first, ...rest] = parts;
  const prefix = first ?? "";
  return rest.reduce(
    (path, part) => `${path.replace(/\/$/, "")}/${part.replace(/^\//, "")}`,
    prefix
  );
}

function toFileUrl(path: string): string {
  return `file://${path.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}
