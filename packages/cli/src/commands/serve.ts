import {
  asNumber,
  asString,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_PREVIEW_PORT,
  runPreviewServer,
} from "./shared";
import type { DrawspecCommand } from "./types";

export const serveCommand: DrawspecCommand = {
  name: "serve",
  description: "Serve diagrams with live reload",
  aliases: ["watch"],
  async run(parsed, config) {
    const noViewer =
      parsed.command === "watch" ||
      parsed.options["no-viewer"] === true ||
      parsed.options["watch-only"] === true;
    return await runPreviewServer({
      files: parsed.files,
      config,
      host: asString(parsed.options["host"]) ?? "localhost",
      port: asNumber(parsed.options["port"], DEFAULT_PREVIEW_PORT),
      debounceMs: asNumber(parsed.options["debounce"], DEFAULT_DEBOUNCE_MS),
      noViewer,
      open: parsed.options["open"] === true,
    });
  },
};
