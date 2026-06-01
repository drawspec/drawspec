import { defineConfig } from "vite";
import { drawspecVitePlugin } from "@drawspec/vite-plugin";

export default defineConfig({
  plugins: [
    drawspecVitePlugin({
      // Only process files with ".sequence.ts" or ".diagram.ts" in their path.
      // include/exclude are substring matches, not globs.
      include: [".sequence.ts", ".diagram.ts"],
    }),
  ],
});
