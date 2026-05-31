import type { DrawspecConfig } from "../config";

export interface ParsedArgs {
  command?: string;
  files: string[];
  options: Record<string, string | boolean>;
}

export interface DrawspecOption {
  name: string;
  description: string;
  valueName?: string;
  defaultValue?: string | boolean;
}

export interface DrawspecCommand {
  name: string;
  description: string;
  aliases?: string[];
  hidden?: boolean;
  options?: DrawspecOption[];
  run(args: ParsedArgs, config: DrawspecConfig): Promise<number>;
}
