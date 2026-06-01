import { sequence } from "@drawspec/uml-sequence";
import { classDiagram } from "@drawspec/uml-class";
import { recommendedRules, RuleEngine, loadPolicyPack } from "@drawspec/validation";
import type { DiagramDocument } from "@drawspec/core";

/**
 * Demonstrates diagram validation using DrawSpec's rule engine.
 *
 * Usage: bun run src/validate.ts
 */
async function validateDiagrams() {
  // Define a sequence diagram.
  const seqDoc: DiagramDocument = sequence("Auth Sequence", (s) => {
    const user = s.actor("User");
    const auth = s.participant("Auth Service");
    user.to(auth, "login");
    auth.to(user, "token");
  });

  // Define a class diagram.
  const classDoc: DiagramDocument = classDiagram("Shapes", (api) => {
    const shape = api.class_("Shape");
    const drawable = api.interface_("Drawable");
    const circle = api.class_("Circle");
    return [
      shape,
      drawable,
      circle,
      api.implements("Circle", "Drawable"),
    ];
  });

  // Create a rule engine with all recommended rules.
  const engine = new RuleEngine(recommendedRules);

  // Validate each diagram.
  const diagrams: DiagramDocument[] = [seqDoc, classDoc];

  for (const doc of diagrams) {
    const result = engine.validate({ diagram: doc });

    if (result.diagnostics.length === 0) {
      console.log(`"${doc.title}": No issues found.`);
    } else {
      console.log(`"${doc.title}": ${result.diagnostics.length} issue(s):`);
      for (const d of result.diagnostics) {
        const loc = d.source ? ` ${d.source.file}:${d.source.line ?? "?"}` : "";
        console.log(`  [${d.severity}] ${d.message} (${d.code ?? "unknown"})${loc}`);
      }
    }
  }

  // You can also use a policy pack to configure rule severity.
  // loadPolicyPack returns a PolicyPack with a rules config (severity overrides),
  // not the rule implementations themselves. Combine it with RuleEngine for full control.
  const strictPack = loadPolicyPack("strict");
  console.log(`\nPolicy pack "${strictPack.name}": ${Object.keys(strictPack.rules).length} rule configs`);

  const available = ["recommended", "strict", "relaxed"];
  console.log(`Available policy packs: ${available.join(", ")}`);
}

validateDiagrams().catch(console.error);
