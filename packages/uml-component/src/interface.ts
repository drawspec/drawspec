import { deterministicId } from "./component";
import type { InterfaceElement } from "./types";

export function interface_(name: string): InterfaceElement {
  return {
    id: deterministicId("ifc", ["interface", name]),
    kind: "interface",
    name,
  };
}

export function provides(componentName: string, interfaceName: string) {
  return {
    id: deterministicId("prv", ["provides", componentName, interfaceName]),
    kind: "provides" as const,
    sourceName: componentName,
    targetName: interfaceName,
  };
}

export function requires(componentName: string, interfaceName: string) {
  return {
    id: deterministicId("req", ["requires", componentName, interfaceName]),
    kind: "requires" as const,
    sourceName: componentName,
    targetName: interfaceName,
  };
}
