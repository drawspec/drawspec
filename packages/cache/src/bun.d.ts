declare const Bun: {
  hash(input: string): number;
};

declare module "bun:sqlite" {
  export class Database {
    constructor(path: string, options?: { create?: boolean });
    query(sql: string): Statement;
    exec(sql: string): void;
  }

  interface Statement {
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number };
  }
}
