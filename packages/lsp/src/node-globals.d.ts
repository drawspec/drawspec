declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare const Bun: {
  write(path: string, content: string): Promise<number>;
  file(path: string): {
    unlink(): Promise<void>;
  };
};
