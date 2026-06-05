import { describe, test } from "bun:test";

/**
 * Verifies that all golden fixture files are in sync with the current renderer output.
 * This catches cases where rendering changes land without updating golden files.
 *
 * How it works:
 *  1. Runs the full test suite with golden regeneration enabled (both env vars).
 *  2. Runs `git diff` to find stale golden fixtures.
 *  3. Fails if any golden files differ from the committed version.
 *
 * This test runs in CI and complements the pre-push hook.
 */
describe("golden fixture freshness", () => {
  test("all golden files match the current renderer output", { timeout: 30000 }, async () => {
    const proc = Bun.spawn(
      [
        "bun",
        "test",
        "--silent",
        "--path-ignore-patterns",
        "golden-freshness.test.ts",
      ],
      {
        cwd: import.meta.dir,
        env: {
          ...Bun.env,
          DRAWSPEC_UPDATE_GOLDEN: "1",
          UPDATE_GOLDEN: "1",
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Test suite failed (exit ${exitCode}). Fix test failures first.\n${stderr}`);
    }

    const diffProc = Bun.spawn(
      ["git", "diff", "--name-only", "--", ":(glob)**/__golden__/**", ":(glob)**/golden/**"],
      { cwd: import.meta.dir, stdout: "pipe" },
    );

    const diffOutput = await new Response(diffProc.stdout).text();
    const changed = diffOutput.trim();

    if (changed) {
      const files = changed.split("\n").map((f) => `  ${f}`).join("\n");
      throw new Error(
        `Stale golden fixtures detected. The following files need to be committed:\n${files}\n\n` +
          "Run: DRAWSPEC_UPDATE_GOLDEN=1 UPDATE_GOLDEN=1 bun test\n" +
          "Then commit the updated golden files.",
      );
    }
  });
});
