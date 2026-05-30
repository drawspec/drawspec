import { asString, loadAll, printDiagnostics, red, validateDocument } from "./shared";
import type { DrawspecCommand } from "./types";

export const inspectCommand: DrawspecCommand = {
  name: "inspect",
  description: "Print diagram IR and diagnostics",
  async run(parsed, config) {
    const target = parsed.files[0];
    if (target === undefined) {
      console.error(red("inspect requires a file path"));
      return 1;
    }
    const [loaded] = await loadAll([target], config);
    if (loaded === undefined || loaded.document === undefined) {
      printDiagnostics(
        loaded?.diagnostics ?? [
          { code: "drawspec/load", severity: "error", message: `No document found in ${target}` },
        ]
      );
      return 1;
    }
    const diagnostics = [...loaded.diagnostics, ...validateDocument(loaded.document, config)];
    const payload = { file: loaded.file, document: loaded.document, diagnostics };
    console.log(
      (asString(parsed.options["format"]) ?? "json") === "pretty"
        ? JSON.stringify(payload, null, 2)
        : JSON.stringify(payload)
    );
    return diagnostics.some((item) => item.severity === "error") ? 1 : 0;
  },
};
