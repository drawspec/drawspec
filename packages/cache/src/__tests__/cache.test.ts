import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  type CacheConfig,
  type CacheStore,
  createCacheStore,
  createFilesystemCacheStore,
  createNoopCacheStore,
  generateCacheKey,
} from "../index";

function makeTempDir(): string {
  const dir = join(
    import.meta.dir,
    "__tmp__",
    `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

let tempDir: string;

beforeEach(() => {
  tempDir = makeTempDir();
});

afterEach(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("generateCacheKey", () => {
  test("returns a string starting with ds_", () => {
    const key = generateCacheKey("content");
    expect(key.startsWith("ds_")).toBe(true);
  });

  test("is deterministic for the same inputs", () => {
    const key1 = generateCacheKey("content", { theme: "dark" });
    const key2 = generateCacheKey("content", { theme: "dark" });
    expect(key1).toBe(key2);
  });

  test("differs when content changes", () => {
    const key1 = generateCacheKey("content-a");
    const key2 = generateCacheKey("content-b");
    expect(key1).not.toBe(key2);
  });

  test("differs when config changes", () => {
    const content = "same-content";
    const key1 = generateCacheKey(content, { theme: "light" });
    const key2 = generateCacheKey(content, { theme: "dark" });
    expect(key1).not.toBe(key2);
  });

  test("differs when format changes", () => {
    const content = "same-content";
    const key1 = generateCacheKey(content, { format: "svg" });
    const key2 = generateCacheKey(content, { format: "png" });
    expect(key1).not.toBe(key2);
  });

  test("differs when package versions change", () => {
    const content = "same-content";
    const key1 = generateCacheKey(content, { packageVersions: { core: "1.0.0" } });
    const key2 = generateCacheKey(content, { packageVersions: { core: "2.0.0" } });
    expect(key1).not.toBe(key2);
  });

  test("is order-independent for config keys", () => {
    const content = "same-content";
    const config1: CacheConfig = { extra: { a: "1", b: "2" } };
    const config2: CacheConfig = { extra: { b: "2", a: "1" } };
    expect(generateCacheKey(content, config1)).toBe(generateCacheKey(content, config2));
  });

  test("empty config and no config produce the same key", () => {
    const content = "same-content";
    expect(generateCacheKey(content)).toBe(generateCacheKey(content, {}));
  });
});

describe("filesystem cache store", () => {
  function createStore(): CacheStore {
    return createFilesystemCacheStore({ cacheDir: tempDir });
  }

  test("get returns null for missing key", async () => {
    const store = createStore();
    const result = await store.get("nonexistent");
    expect(result).toBeNull();
  });

  test("set and get round-trip", async () => {
    const store = createStore();
    await store.set("key1", { svg: "<svg>hello</svg>" });
    const result = await store.get("key1");
    expect(result).toEqual({ svg: "<svg>hello</svg>" });
  });

  test("has returns false for missing key", async () => {
    const store = createStore();
    expect(await store.has("missing")).toBe(false);
  });

  test("has returns true after set", async () => {
    const store = createStore();
    await store.set("key1", "value");
    expect(await store.has("key1")).toBe(true);
  });

  test("delete returns false for missing key", async () => {
    const store = createStore();
    expect(await store.delete("missing")).toBe(false);
  });

  test("delete removes an entry and returns true", async () => {
    const store = createStore();
    await store.set("key1", "value");
    expect(await store.delete("key1")).toBe(true);
    expect(await store.get("key1")).toBeNull();
  });

  test("clear removes all entries", async () => {
    const store = createStore();
    await store.set("key1", "value1");
    await store.set("key2", "value2");
    await store.clear();
    expect(await store.get("key1")).toBeNull();
    expect(await store.get("key2")).toBeNull();
  });

  test("overwrites existing key", async () => {
    const store = createStore();
    await store.set("key1", "old");
    await store.set("key1", "new");
    expect(await store.get("key1")).toBe("new");
  });

  test("stores various value types", async () => {
    const store = createStore();
    await store.set("string", "hello");
    await store.set("number", 42);
    await store.set("boolean", true);
    await store.set("null", null);
    await store.set("array", [1, 2, 3]);
    await store.set("object", { nested: { deep: true } });

    expect(await store.get("string")).toBe("hello");
    expect(await store.get("number")).toBe(42);
    expect(await store.get("boolean")).toBe(true);
    expect(await store.get("null")).toBeNull();
    expect(await store.get("array")).toEqual([1, 2, 3]);
    expect(await store.get("object")).toEqual({ nested: { deep: true } });
  });

  test("creates cache directory if it does not exist", async () => {
    const nestedDir = join(tempDir, "nested", "deep");
    const store = createFilesystemCacheStore({ cacheDir: nestedDir });
    await store.set("key1", "value");
    expect(existsSync(nestedDir)).toBe(true);
    expect(await store.get("key1")).toBe("value");
  });
});

describe("createCacheStore factory", () => {
  test("creates filesystem store by default", async () => {
    const store = createCacheStore({ cacheDir: tempDir });
    await store.set("key1", "value");
    expect(await store.get("key1")).toBe("value");
    expect(existsSync(join(tempDir, "key1.json"))).toBe(true);
  });

  test("creates filesystem store explicitly", async () => {
    const store = createCacheStore({ strategy: "filesystem", cacheDir: tempDir });
    await store.set("key1", "value");
    expect(await store.get("key1")).toBe("value");
  });

  test("throws for unknown strategy", () => {
    expect(() =>
      createCacheStore({ strategy: "unknown" as "filesystem" | "sqlite", cacheDir: tempDir })
    ).toThrow("Unknown cache strategy: unknown");
  });
});

describe("noop cache store", () => {
  test("get always returns null", async () => {
    const store = createNoopCacheStore();
    expect(await store.get("any-key")).toBeNull();
  });

  test("set does nothing", async () => {
    const store = createNoopCacheStore();
    await store.set("key1", "value");
    expect(await store.get("key1")).toBeNull();
  });

  test("has always returns false", async () => {
    const store = createNoopCacheStore();
    await store.set("key1", "value");
    expect(await store.has("key1")).toBe(false);
  });

  test("delete always returns false", async () => {
    const store = createNoopCacheStore();
    expect(await store.delete("any-key")).toBe(false);
  });

  test("clear does nothing", async () => {
    const store = createNoopCacheStore();
    await store.clear();
  });
});

describe("cache integration scenario", () => {
  test("cache miss then fill then hit", async () => {
    const store = createFilesystemCacheStore({ cacheDir: tempDir });
    const content = "diagram content";
    const config: CacheConfig = { theme: "light" };
    const key = generateCacheKey(content, config);

    expect(await store.get(key)).toBeNull();

    const svg = "<svg>rendered</svg>";
    await store.set(key, svg);

    expect(await store.get(key)).toBe("<svg>rendered</svg>");
  });

  test("config change invalidates cache", async () => {
    const store = createFilesystemCacheStore({ cacheDir: tempDir });
    const content = "diagram content";

    const key1 = generateCacheKey(content, { theme: "light" });
    const key2 = generateCacheKey(content, { theme: "dark" });

    await store.set(key1, "light-svg");
    expect(await store.get(key1)).toBe("light-svg");
    expect(await store.get(key2)).toBeNull();
  });

  test("content change invalidates cache", async () => {
    const store = createFilesystemCacheStore({ cacheDir: tempDir });
    const key1 = generateCacheKey("content-v1", { theme: "light" });
    const key2 = generateCacheKey("content-v2", { theme: "light" });

    await store.set(key1, "svg-v1");
    expect(await store.get(key1)).toBe("svg-v1");
    expect(await store.get(key2)).toBeNull();
  });
});
