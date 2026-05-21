/**
 * @drawspec/cache — Persistent filesystem cache for compiled IR and rendered SVGs.
 *
 * Cache keys are deterministic hashes of content + config, ensuring
 * automatic invalidation when any input changes.
 *
 * Two storage strategies:
 * - **filesystem** (default): JSON files in a cache directory
 * - **sqlite**: Optional SQLite backend via bun:sqlite
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export { DependencyGraph, extractImports } from "./dependency-graph";

/** Configuration values that influence cache key generation. */
export interface CacheConfig {
  readonly theme?: string;
  readonly format?: string;
  readonly packageVersions?: Readonly<Record<string, string>>;
  readonly extra?: Readonly<Record<string, string>>;
}

/** Options for creating a cache store. */
export interface CacheStoreOptions {
  readonly strategy?: "filesystem" | "sqlite";
  readonly cacheDir?: string;
}

/** A cache store with get/set/clear semantics. */
export interface CacheStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

function bunHash(input: string): string {
  return (Bun.hash(input) as number).toString(16).padStart(16, "0");
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return `${value}n`;

  if (Array.isArray(value)) {
    const items = value.map((item) => stableSerialize(item));
    return `[${items.join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => `"${key}":${stableSerialize(obj[key])}`);
    return `{${pairs.join(",")}}`;
  }

  return String(value);
}

/** Generate a deterministic cache key from content and configuration. */
export function generateCacheKey(content: string, config: CacheConfig = {}): string {
  const payload = stableSerialize({ content, config });
  return `ds_${bunHash(payload)}`;
}

const DEFAULT_CACHE_DIR = "node_modules/.cache/drawspec";

export function createFilesystemCacheStore(options: CacheStoreOptions = {}): CacheStore {
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;

  function ensureDir(): void {
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
  }

  function entryPath(key: string): string {
    return join(cacheDir, `${key}.json`);
  }

  return {
    async get(key: string): Promise<unknown | null> {
      const path = entryPath(key);
      if (!existsSync(path)) {
        return null;
      }
      try {
        const raw = readFileSync(path, "utf-8");
        const entry = JSON.parse(raw) as { value: unknown };
        return entry.value;
      } catch {
        return null;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      ensureDir();
      writeFileSync(entryPath(key), JSON.stringify({ value }), "utf-8");
    },

    async has(key: string): Promise<boolean> {
      return existsSync(entryPath(key));
    },

    async delete(key: string): Promise<boolean> {
      const path = entryPath(key);
      if (!existsSync(path)) {
        return false;
      }
      rmSync(path);
      return true;
    },

    async clear(): Promise<void> {
      if (!existsSync(cacheDir)) {
        return;
      }
      const files = readdirSync(cacheDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          rmSync(join(cacheDir, file));
        }
      }
    },
  };
}

export function createSqliteCacheStore(options: CacheStoreOptions = {}): CacheStore {
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const dbPath = join(cacheDir, "drawspec-cache.db");

  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  let database: import("bun:sqlite").Database;
  try {
    const { Database } = requireBunSqlite();
    database = new Database(dbPath, { create: true });
    database.exec("PRAGMA journal_mode=WAL");
    database.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  } catch {
    return createFilesystemCacheStore(options);
  }

  return {
    async get(key: string): Promise<unknown | null> {
      const row = database.query("SELECT value FROM cache_entries WHERE key = ?").get(key) as {
        value: string;
      } | null;
      if (row === null) {
        return null;
      }
      try {
        return (JSON.parse(row.value) as { value: unknown }).value;
      } catch {
        return null;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      database
        .query(
          "INSERT OR REPLACE INTO cache_entries (key, value, created_at) VALUES (?, ?, unixepoch())"
        )
        .run(key, JSON.stringify({ value }));
    },

    async has(key: string): Promise<boolean> {
      const row = database.query("SELECT 1 FROM cache_entries WHERE key = ?").get(key) as unknown;
      return row !== null;
    },

    async delete(key: string): Promise<boolean> {
      const result = database.query("DELETE FROM cache_entries WHERE key = ?").run(key);
      return result.changes > 0;
    },

    async clear(): Promise<void> {
      database.exec("DELETE FROM cache_entries");
    },
  };
}

function requireBunSqlite(): typeof import("bun:sqlite") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("bun:sqlite") as typeof import("bun:sqlite");
}

/** Create a cache store with the specified strategy. Defaults to filesystem. */
export function createCacheStore(options: CacheStoreOptions = {}): CacheStore {
  const strategy = options.strategy ?? "filesystem";
  switch (strategy) {
    case "sqlite":
      return createSqliteCacheStore(options);
    case "filesystem":
      return createFilesystemCacheStore(options);
    default:
      throw new Error(`Unknown cache strategy: ${strategy}`);
  }
}

/** No-op cache store that always returns null. For `--no-cache` CLI flag. */
export function createNoopCacheStore(): CacheStore {
  return {
    async get(): Promise<null> {
      return null;
    },
    async set(): Promise<void> {},
    async has(): Promise<boolean> {
      return false;
    },
    async delete(): Promise<boolean> {
      return false;
    },
    async clear(): Promise<void> {},
  };
}
