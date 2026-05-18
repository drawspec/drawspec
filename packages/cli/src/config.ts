import type { RuleConfig } from "@drawspec/validation";

export interface DrawspecConfig {
  readonly files?: readonly string[];
  readonly outDir?: string;
  readonly theme?: string;
  readonly rules?: RuleConfig;
  readonly render?: {
    readonly defaultFormat?: "svg";
    readonly theme?: string;
  };
  readonly validation?: {
    readonly rules?: RuleConfig;
  };
}

export function defineConfig(config: DrawspecConfig): DrawspecConfig {
  return config;
}
