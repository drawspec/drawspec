#!/usr/bin/env bun
import { serializeDocument } from "@drawspec/core";
import { buildCommand } from "./commands/build";
import { buildDocsCommand } from "./commands/build-docs";
import { checkCommand } from "./commands/check";
import { exportCommand } from "./commands/export";
import { galleryCommand } from "./commands/gallery";
import { inspectCommand } from "./commands/inspect";
import {
  getCommand,
  listCommands,
  registerCommand,
  registerPackageCommands,
} from "./commands/registry";
import { renderCommand } from "./commands/render";
import { serveCommand } from "./commands/serve";
import { serveDocsCommand } from "./commands/serve-docs";
import { asString, loadConfig, red } from "./commands/shared";
import type { DrawspecCommand, ParsedArgs } from "./commands/types";

declare const process: { cwd(): string; exit(code?: number): never };
declare const console: { log(message?: unknown): void; error(message?: unknown): void };
declare const Bun: { argv: string[]; file(path: string): { exists(): Promise<boolean> } };

const builtInCommands: DrawspecCommand[] = [
  checkCommand,
  exportCommand,
  renderCommand,
  inspectCommand,
  serveCommand,
  galleryCommand,
  buildCommand,
  buildDocsCommand,
  serveDocsCommand,
];

for (const command of builtInCommands) registerCommand(command);

export async function main(argv: readonly string[] = Bun.argv.slice(2)): Promise<number> {
  await registerPackageCommands();
  const parsed = parseArgs(argv);
  if (parsed.options["help"] === true) {
    printHelp();
    return 0;
  }
  if (parsed.command === undefined) {
    const unknownToken = await findUnknownToken(argv);
    if (unknownToken !== undefined) {
      console.error(red(`Unknown command: '${unknownToken}'`));
      printHelp();
      return 1;
    }
    printHelp();
    return 0;
  }
  const config = await loadConfig(asString(parsed.options["config"]));
  const command = getCommand(parsed.command);
  if (command === undefined) {
    console.error(red(`Unknown command: '${parsed.command}'`));
    printHelp();
    return 1;
  }
  return command.run(parsed, config);
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const options: Record<string, string | boolean> = {};
  const files: string[] = [];
  let command: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === "--help" || arg === "-h") {
      options["help"] = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[name] = next;
        index += 1;
      } else {
        options[name] = true;
      }
      continue;
    }
    if (command === undefined) {
      const twoPart = argv[index + 1] === undefined ? undefined : `${arg} ${argv[index + 1]}`;
      if (twoPart !== undefined && getCommand(twoPart) !== undefined) {
        command = twoPart;
        index += 1;
        continue;
      }
      if (getCommand(arg) !== undefined) {
        command = arg;
        continue;
      }
    }
    files.push(arg);
  }
  return { ...(command !== undefined ? { command } : {}), files, options };
}

function printHelp(): void {
  const commands = listCommands()
    .filter((command) => command.hidden !== true)
    .map((command) => `  drawspec ${command.name.padEnd(12)} ${command.description}`)
    .join("\n");
  console.log(`drawspec — TypeScript-native diagrams as code

Usage:
${commands}
  drawspec build:site   Alias for gallery
  drawspec build-site   Alias for gallery

Common options: --help, --config path
Common command options: --theme name, --policy name
Command aliases: watch → serve --watch-only, build:site/build-site → gallery
Aliases: ds, dspec
Discovery: **/*.diagram.ts, **/*.arch.ts, **/*.sequence.ts`);
}

async function findUnknownToken(argv: readonly string[]): Promise<string | undefined> {
  for (const arg of argv) {
    if (arg === undefined || arg.startsWith("--") || arg.startsWith("-")) continue;
    if (getCommand(arg) !== undefined) continue;
    if (!(await Bun.file(arg).exists())) return arg;
  }
  return undefined;
}

if (import.meta.url === toFileUrl(absolutePath(Bun.argv[1] ?? ""))) {
  process.exit(await main());
}

function absolutePath(path: string): string {
  return path.startsWith("/") ? path : `${process.cwd()}/${path}`;
}

function toFileUrl(path: string): string {
  return `file://${path.split("/").map(encodeURIComponent).join("/").replaceAll("%2F", "/")}`;
}

export { serializeDocument };
