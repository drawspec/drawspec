declare module "node:fs" {
  export interface FSWatcher {
    close(): void;
  }

  export function existsSync(path: string): boolean;
  export function watch(
    path: string,
    options: { persistent: boolean },
    listener: () => void
  ): FSWatcher;
}
