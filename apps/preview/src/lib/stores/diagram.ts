import type { Diagnostic } from "@drawspec/core";
import { writable } from "svelte/store";

export interface DiagramEntry {
  id: string;
  label: string;
  svg: string;
}

export const diagrams = writable<DiagramEntry[]>([]);
export const selectedId = writable<string>("");
export const currentSvg = writable<string>("");
export const diagnostics = writable<Diagnostic[]>([]);
export const theme = writable<"light" | "dark">("light");
export const connected = writable<boolean>(false);

// Persist theme preference
if (typeof localStorage !== "undefined") {
  const stored = localStorage.getItem("drawspec-theme");
  if (stored === "light" || stored === "dark") {
    theme.set(stored);
  }
}

theme.subscribe((value) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("drawspec-theme", value);
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", value);
  }
});
