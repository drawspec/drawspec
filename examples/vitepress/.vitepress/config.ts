import { defineConfig } from "vitepress";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  title: "DrawSpec Docs",
  description: "Documentation site with embedded DrawSpec diagrams",

  // VitePress uses Vite internally, so DrawSpec's Vite plugin works
  // by adding it to the vite.plugins configuration.
  vite: {
    plugins: [
      drawspecVitePlugin({
        include: [".sequence.ts", ".diagram.ts"],
      }),
    ],
  },
});
