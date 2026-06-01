# Getting Started

This guide explains how to embed DrawSpec diagrams in VitePress pages.

## How It Works

VitePress is built on Vite, so the DrawSpec Vite plugin works by adding it to
the `vite.plugins` array in `.vitepress/config.ts`:

```ts
import { defineConfig } from "vitepress";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  vite: {
    plugins: [
      drawspecVitePlugin({
        include: [".sequence.ts", ".diagram.ts"],
      }),
    ],
  },
});
```

## Rendering Diagrams in Markdown

Create a diagram file using the DrawSpec API:

```ts
// src/login-flow.sequence.ts
import { sequence } from "@drawspec/uml-sequence";

export const loginFlow = sequence("Login Flow", (s) => {
  const client = s.actor("Client");
  const server = s.participant("Server");
  client.to(server, "POST /login");
  server.to(client, "200 OK");
});
```

Then use it in a Vue `<script setup>` block inside your markdown:

```md
<script setup>
import { ref, onMounted } from "vue";
import { renderDiagram } from "../src/render.ts";
import { loginFlow } from "../src/login-flow.sequence.ts";

const svg = ref("");
onMounted(async () => {
  svg.value = await renderDiagram(loginFlow);
});
</script>

<div v-html="svg"></div>
```

## Hot Module Replacement

When you edit a `.sequence.ts` file, VitePress automatically picks up the change
and hot-reloads the diagram on the page. No manual refresh needed.

## Validation

The Vite plugin compiles diagrams but does not run validation rules. Use the CLI
to check diagrams:

```bash
bunx drawspec check src/login-flow.sequence.ts
```

## See Also

- [DrawSpec Documentation](https://drawspec.dev/docs)
- [Vite Plugin API](../../packages/vite-plugin)
