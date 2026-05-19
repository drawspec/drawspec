import { createDeterministicId } from "@drawspec/core";
import type { Artifact } from "./types";

export function createArtifact(name: string, parentNodeId: string, index = 0): Artifact {
  return {
    id: createDeterministicId({ kind: "artifact", name, parentNodeId, index }, { prefix: "art" }),
    name,
    parentNodeId,
  };
}
