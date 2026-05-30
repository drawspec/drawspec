import type { DrawspecCommand } from "./types";

const commands = new Map<string, DrawspecCommand>();

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

export function registerPackageCommands(packageCommands: Iterable<DrawspecCommand>): void {
  for (const command of packageCommands) {
    registerCommand(command);
  }
}

function registerName(name: string, command: DrawspecCommand): void {
  const existing = commands.get(name);
  if (existing !== undefined && existing !== command) {
    throw new Error(`Command '${name}' is already registered`);
  }
  commands.set(name, command);
}
