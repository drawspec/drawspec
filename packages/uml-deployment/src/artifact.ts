import { createDeterministicId } from "@drawspec/core";
import type { Artifact } from "./types";

export function createArtifact(name: string, parentNodeId: string): Artifact {
  return {
    id: createDeterministicId({ kind: "artifact", name, parentNodeId }, { prefix: "art" }),
    name,
    parentNodeId,
  };
}
