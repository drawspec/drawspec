# DrawSpec + Vite (Vanilla TypeScript)

A minimal Vite project that uses the DrawSpec Vite plugin to compile and hot-reload sequence diagrams.

## Getting Started

```bash
bun install
bun run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## How It Works

1. **`vite.config.ts`** registers the `drawspecVitePlugin` which intercepts imports of diagram files (files matching `.sequence.ts` or `.diagram.ts` by default).

2. **`src/hello.sequence.ts`** defines a sequence diagram using the `sequence()` builder from `@drawspec/uml-sequence`. The Vite plugin compiles this to a serialized `DiagramDocument` at build time.

3. **`src/main.ts`** imports the compiled diagram, runs layout via `sequenceLayout()`, renders to SVG via `renderSvg()`, and inserts the result into the page.

## HMR (Hot Module Replacement)

When you edit `hello.sequence.ts`, the Vite plugin detects the change and recompiles the diagram. The page updates instantly without a full reload.

## Adding More Diagrams

1. Create a new file like `src/my-diagram.diagram.ts` or `src/another.sequence.ts`
2. Import it in `main.ts` (or a separate module)
3. The Vite plugin will automatically process it

## Vite Plugin Options

```ts
drawspecVitePlugin({
  // Only process files whose path contains these substrings.
  // These are substring matches, not globs.
  include: [".sequence.ts", ".diagram.ts"],

  // Exclude files whose path contains these substrings.
  exclude: [".test.", "__tests__"],
})
```

## Validation

The Vite plugin compiles diagrams but does not run validation. Use the DrawSpec CLI for that:

```bash
bunx drawspec check src/hello.sequence.ts
```
