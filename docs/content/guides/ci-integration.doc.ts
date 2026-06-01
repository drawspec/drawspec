import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "CI Integration",
  description: "Run DrawSpec validation, rendering, and gallery generation in GitHub Actions",
  content: await md`
# CI Integration

You can integrate DrawSpec into your CI pipeline to validate diagrams on every pull request, generate rendered SVGs as build artifacts, and produce a diagram gallery for review.

## GitHub Actions Workflow

Here is a complete workflow that validates diagrams, renders them, and uploads artifacts:

\`\`\`yaml
name: DrawSpec CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    name: Validate diagrams
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Validate diagrams
        run: bunx drawspec check .

  render:
    name: Render diagrams
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Render diagrams to SVG
        run: bunx drawspec render . --out dist

      - name: Upload SVG artifacts
        uses: actions/upload-artifact@v4
        with:
          name: diagram-svgs
          path: dist/
          retention-days: 30

  gallery:
    name: Generate diagram gallery
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Generate gallery
        run: bunx drawspec gallery --out gallery

      - name: Upload gallery
        uses: actions/upload-artifact@v4
        with:
          name: diagram-gallery
          path: gallery
          retention-days: 14
\`\`\`

## Validating Changed Diagrams Only

To avoid checking every diagram on every push, use a matrix strategy that only checks files that changed:

\`\`\`yaml
jobs:
  check-changed:
    name: Validate changed diagrams
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Find changed diagram files
        id: changed
        run: |
          echo "files=$(git diff --name-only origin/main...HEAD | grep -E '\.(diagram|arch|sequence)\.ts$' | tr '\n' ' ')" >> $GITHUB_OUTPUT

      - name: Validate changed diagrams
        if: steps.changed.outputs.files != ''
        run: bunx drawspec check \${{ steps.changed.outputs.files }}
\`\`\`

## PR Validation with Conventional Commits

DrawSpec uses \`cocogitto\` to enforce conventional commit messages. Add this step to your commit-lint job:

\`\`\`yaml
- name: Check commit messages
  run: cog check \${{ github.event.pull_request.base.sha }}..\${{ github.event.pull_request.head.sha }}
\`\`\`

Install \`cog\` with your system toolchain before running the check; it is the Cocogitto binary, not an npm package. For example, this repository installs Cocogitto through \`mise install\` and then runs \`cog check\` against the pull request commit range.

## Caching Dependencies

Speed up CI runs by caching Bun dependencies:

\`\`\`yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: \${{ runner.os }}-bun-\${{ hashFiles('bun.lock') }}
    restore-keys: |
      \${{ runner.os }}-bun-
\`\`\`

## Gallery Generation

The \`drawspec gallery\` command generates an HTML page that displays all diagrams in a directory:

\`\`\`bash
bunx drawspec gallery --out gallery
\`\`\`

The output includes a navigation sidebar and rendered SVG previews. Upload the gallery folder as an artifact to share diagram output with your team during code review.
`,
});
