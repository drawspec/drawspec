# DrawSpec + VitePress

A VitePress documentation site with embedded DrawSpec diagrams that hot-reload during development.

## Getting Started

```bash
bun install
bun run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## How It Works

1. **`.vitepress/config.ts`** registers the DrawSpec Vite plugin under `vite.plugins`. VitePress uses Vite internally, so the plugin works seamlessly.

2. **`src/login-flow.sequence.ts`** defines a sequence diagram. The Vite plugin compiles it to a serialized `DiagramDocument`.

3. **`src/render.ts`** provides a `renderDiagram()` helper that runs layout and SVG rendering for use in Vue components.

4. **Markdown pages** use Vue `<script setup>` blocks to import diagrams and render them inline.

## HMR

When you edit any `.sequence.ts` file, VitePress hot-reloads the diagram on the page without a full page refresh.

## Adding More Diagrams

1. Create a new diagram file: `src/my-diagram.diagram.ts`
2. Import it in your markdown page via `<script setup>`
3. Pass it to `renderDiagram()` to get the SVG string
