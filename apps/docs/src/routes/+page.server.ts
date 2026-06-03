import { codeToHtml } from "shiki";

const quickStartCode = `import { sequence } from "@drawspec/uml-sequence";

sequence("Hello", (s) => {
  s.actor("Alice");
  s.actor("Bob");
  s.message("Alice", "Bob", "Hello!");
});`;

export async function load() {
  const quickStartHtml = await codeToHtml(quickStartCode, {
    lang: "typescript",
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });

  return { quickStartCode, quickStartHtml };
}
