import { asString, diagnosticsFor, green, loadAll, printDiagnostics, red } from "./shared";
import type { DrawspecCommand } from "./types";

export const checkCommand: DrawspecCommand = {
  name: "check",
  description: "Validate diagram files",
  async run(parsed, config) {
    const loaded = await loadAll(parsed.files, config);
    const diagnostics = diagnosticsFor(loaded, config, asString(parsed.options["policy"]));
    if (asString(parsed.options["format"]) === "json") {
      console.log(JSON.stringify({ diagnostics }, null, 2));
    } else {
      printDiagnostics(diagnostics);
      console.log(
        diagnostics.some((item) => item.severity === "error")
          ? red("check failed")
          : green("check passed")
      );
    }
    return diagnostics.some((item) => item.severity === "error") ? 1 : 0;
  },
};
